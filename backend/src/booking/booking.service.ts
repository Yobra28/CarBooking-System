/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingEventsService } from './booking.events.service';
// import {User} from '../users/interface';

@Injectable()
export class BookingService {
  constructor(
      private prisma: PrismaService,
      private emailService: EmailService,
      private events: BookingEventsService,
    ) {}

  private calculateDays(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  private calculateTotalPrice(vehicles: any[]): number {
    let totalPrice = 0;
    
    for (const vehicle of vehicles) {
      const days = this.calculateDays(vehicle.startDate, vehicle.endDate);
      const vehiclePrice = vehicle.price || 0;
      totalPrice += days * vehiclePrice;
    }
    
    return totalPrice;
  }
async create(data: CreateBookingDto) {
  console.log('Creating booking with data:', JSON.stringify(data, null, 2));

  const calculatedTotalPrice = this.calculateTotalPrice(data.vehicles);
  const finalTotalPrice = data.totalPrice || calculatedTotalPrice;

  console.log('Calculated total price:', calculatedTotalPrice);
  console.log('Final total price:', finalTotalPrice);

  // ✅ 1. DO TRANSACTION FIRST (NO EMAILS HERE)
  const { booking, bookingItems, emailToSend, nameToSend, autoConfirmed } =
    await this.prisma.$transaction(async (prisma) => {
      // ✅ All KYC checks (fast)
      let user: { isKycVerified: boolean; driverLicenseUrl?: string | null; nationalIdUrl?: string | null; liveProfileUrl?: string | null } | null = null;
      if (data.userId) {
        user = await prisma.user.findUnique({
          where: { id: data.userId },
          select: {
            isKycVerified: true,
            driverLicenseUrl: true,
            nationalIdUrl: true,
            liveProfileUrl: true,
          },
        });

        if (user) {
          const hasSubmittedKyc = !!(
            user.driverLicenseUrl &&
            user.nationalIdUrl &&
            user.liveProfileUrl
          );

          if (!hasSubmittedKyc) {
            throw new BadRequestException({
              code: 'KYC_REQUIRED',
              message:
                'Please upload your driving license, national ID and live profile photo to proceed with your first booking.',
            });
          }
        }
      }

      // ✅ Determine initial status: auto-confirm if KYC is verified
      const initialStatus = user?.isKycVerified ? 'CONFIRMED' : 'PENDING';
      const confirmedAt = initialStatus === 'CONFIRMED' ? new Date() : undefined;

      // ✅ Create booking
      const booking = await prisma.booking.create({
        data: {
          userId: data.userId,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          status: initialStatus as any,
          confirmedAt: confirmedAt,
          totalPrice: finalTotalPrice,
        },
      });

      // ✅ Create items
      const bookingItems = await Promise.all(
        data.vehicles.map(async (vehicle) => {
          const days = this.calculateDays(vehicle.startDate, vehicle.endDate);
          const itemPrice = (vehicle.price || 0) * days;

          return prisma.bookingItem.create({
            data: {
              bookingId: booking.id,
              vehicleId: vehicle.vehicleId,
              startDate: vehicle.startDate,
              endDate: vehicle.endDate,
              price: itemPrice,
            },
          });
        })
      );

      // ✅ Prepare email data INSIDE transaction, but do not send here!
      let emailToSend = data.guestEmail;
      let nameToSend = data.guestName || 'Valued Customer';

      if (data.userId) {
        const user = await prisma.user.findUnique({
          where: { id: data.userId },
          select: { email: true, firstName: true, lastName: true },
        });

        if (user?.email) {
          emailToSend = user.email;
          nameToSend = `${user.firstName} ${user.lastName}`.trim();
        }
      }

      return { booking, bookingItems, emailToSend, nameToSend, autoConfirmed: initialStatus === 'CONFIRMED' };
    });

  // Emit created event
  this.events.publish({ type: 'booking_created', payload: { ...booking, bookingItems } });

  // ✅ 2. SEND EMAILS AFTER TRANSACTION (SAFE)
  try {
    if (emailToSend) {
      if (autoConfirmed) {
        void this.emailService
          .sendBookingConfirmationEmail(
            emailToSend,
            nameToSend,
            {
              id: booking.id,
              startDate: bookingItems[0]?.startDate,
              endDate: bookingItems[0]?.endDate,
              totalPrice: booking.totalPrice,
              status: booking.status,
            }
          )
          .catch((err) => console.error('Failed to send confirmation email:', err));
      } else {
        void this.emailService
          .sendBookingPendingEmail(emailToSend, nameToSend, {
            id: booking.id,
            startDate: bookingItems[0]?.startDate.toISOString(),
            endDate: bookingItems[0]?.endDate.toISOString(),
            totalPrice: booking.totalPrice,
            status: booking.status,
          })
          .catch((err) => console.error('Failed to send pending email:', err));
      }
    }
  } catch (err) {
    console.error('Failed to enqueue booking email:', err);
  }

  try {
    void this.emailService
      .sendBookingNotificationToAdminsAndAgents(
        {
          id: booking.id,
          startDate: bookingItems[0]?.startDate.toISOString(),
          endDate: bookingItems[0]?.endDate.toISOString(),
          totalPrice: booking.totalPrice,
          status: booking.status,
          createdAt: booking.createdAt,
        },
        {
          name: nameToSend,
          email: emailToSend ?? "",
          phone: data.guestPhone,
        }
      )
      .catch((err) => console.error('Failed to send admin notification:', err));
  } catch (err) {
    console.error('Failed to enqueue admin notification:', err);
  }

  const message = autoConfirmed
    ? 'Booking successful and automatically confirmed!'
    : 'Booking successful! Your booking is pending approval. You will receive a confirmation email once approved.';

  return {
    message,
    booking: {
      ...booking,
      bookingItems,
    },
  };
}


  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookingItems: {
          include: {
            vehicle: {
              select: {
                id: true,
                name: true,
                make: true,
                model: true,
                images: true,
                pricePerDay: true,
              },
            },
          },
        },
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookingItems: {
          include: {
            vehicle: {
              select: {
                id: true,
                name: true,
                make: true,
                model: true,
                images: true,
                pricePerDay: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isKycVerified: true,
          },
        },
        bookingItems: {
          include: {
            vehicle: {
              select: {
                id: true,
                name: true,
                make: true,
                model: true,
                images: true,
                pricePerDay: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async update(id: string, updateData: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isKycVerified: true,
          },
        },
        bookingItems: {
          include: {
            vehicle: {
              select: {
                id: true,
                name: true,
                make: true,
                model: true,
                images: true,
                pricePerDay: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Prevent confirming booking if user's KYC is not verified
    if (updateData.status === 'CONFIRMED' && booking.user?.id && !booking.user.isKycVerified) {
      throw new BadRequestException('Cannot confirm booking until user KYC is verified');
    }

    // If status is changing to CONFIRMED, set confirmedAt
    if (updateData.status === 'CONFIRMED' && booking.status !== 'CONFIRMED') {
      updateData.confirmedAt = new Date();
    }

    // Enforce workflow: can only complete a confirmed booking
    if (updateData.status === 'COMPLETED' && booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Cannot complete booking before it is confirmed');
    }

    // If status is changing to COMPLETED, compute late fee once and set completedAt
    if (updateData.status === 'COMPLETED' && booking.status !== 'COMPLETED') {
      const end = booking.bookingItems[0]?.endDate ? new Date(booking.bookingItems[0].endDate as any) : null;
      const now = new Date();
      let lateFee = 0;
      if (end && now > end) {
        const diffMs = now.getTime() - end.getTime();
        const hours = Math.ceil(diffMs / (1000 * 60 * 60));
        lateFee = hours * 20;
      }
      updateData.completedAt = now;
      if (lateFee > 0) {
        updateData.lateFee = lateFee;
        updateData.totalPrice = (booking.totalPrice || 0) + lateFee;
      }
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookingItems: {
          include: {
            vehicle: {
              select: {
                id: true,
                name: true,
                make: true,
                model: true,
                images: true,
                pricePerDay: true,
              },
            },
          },
        },
      },
    });

    if (updateData.status === 'CONFIRMED' && booking.status !== 'CONFIRMED') {
      try {
        const customerEmail = booking.user?.email || booking.guestEmail;
        const customerName = booking.user
          ? `${booking.user.firstName} ${booking.user.lastName}`
          : booking.guestName || 'Valued Customer';

        if (customerEmail) {
          void this.emailService
            .sendBookingConfirmationEmail(
              customerEmail,
              customerName,
              {
                id: updatedBooking.id,
                startDate: updatedBooking.bookingItems[0]?.startDate,
                endDate: updatedBooking.bookingItems[0]?.endDate,
                totalPrice: updatedBooking.totalPrice,
                status: updatedBooking.status,
              }
            )
            .catch((error) => console.error('Failed to send confirmation email:', error));
        }
      } catch (error) {
        console.error('Failed to enqueue confirmation email:', error);
      }
    }

    // Emit update event
    this.events.publish({ type: 'booking_updated', payload: updatedBooking });

    return updatedBooking;
  }

  async cancelBooking(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookingItems: {
          include: {
            vehicle: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Update booking status to cancelled
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookingItems: {
          include: {
            vehicle: {
              select: {
                id: true,
                name: true,
                make: true,
                model: true,
                images: true,
                pricePerDay: true,
              },
            },
          },
        },
      },
    });

    // Send notification to agents
    const customerName = booking.user 
      ? `${booking.user.firstName} ${booking.user.lastName}`
      : booking.guestName || 'Guest Customer';
    
    const vehicleName = booking.bookingItems[0]?.vehicle?.name || 'Unknown Vehicle';

    void this.emailService
      .sendBookingCancellationNotification(
        id,
        customerName,
        vehicleName
      )
      .catch((err) => console.error('Failed to send cancellation notification:', err));

    return updatedBooking;
    this.events.publish({ type: 'booking_cancelled', payload: updatedBooking });

    return updatedBooking;
  }

  async remove(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    await this.prisma.booking.delete({
      where: { id },
    });

    return { message: 'Booking deleted successfully' };
  }
} 