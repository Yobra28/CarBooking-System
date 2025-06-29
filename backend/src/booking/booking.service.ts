/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingService {
    constructor(
      private prisma: PrismaService,
      private emailService: EmailService
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
    
    // Calculate total price based on days and vehicle prices
    const calculatedTotalPrice = this.calculateTotalPrice(data.vehicles);
    
    // Use calculated price if not provided, otherwise use provided price
    const finalTotalPrice = data.totalPrice || calculatedTotalPrice;
    
    console.log('Calculated total price:', calculatedTotalPrice);
    console.log('Final total price:', finalTotalPrice);
    
    return this.prisma.$transaction(async (prisma) => {
      const booking = await prisma.booking.create({
        data: {
          userId: data.userId,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          status: 'PENDING',
          totalPrice: finalTotalPrice,
        },
      });

      console.log('Created booking:', booking);

      const bookingItems = await Promise.all(
        data.vehicles.map((vehicle) => {
          const days = this.calculateDays(vehicle.startDate, vehicle.endDate);
          const itemPrice = vehicle.price || 0;
          
          return prisma.bookingItem.create({
            data: {
              bookingId: booking.id,
              vehicleId: vehicle.vehicleId,
              startDate: vehicle.startDate,
              endDate: vehicle.endDate,
              price: itemPrice * days, // Store the total price for this item
            },
          });
        })
      );

      console.log('Created booking items:', bookingItems);

      // Send confirmation email if guest email is provided
      if (data.guestEmail) {
        try {
          await this.emailService.sendBookingConfirmationEmail(
            data.guestEmail,
            data.guestName || 'Valued Customer',
            {
              id: booking.id,
              startDate: data.vehicles[0]?.startDate,
              endDate: data.vehicles[0]?.endDate,
              totalPrice: finalTotalPrice,
              status: booking.status,
            }
          );
        } catch (error) {
          console.error('Failed to send confirmation email:', error);
        }
      }

      return {
        ...booking,
        bookingItems,
      };
    });
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

    // Send confirmation email if status changed to CONFIRMED
    if (updateData.status === 'CONFIRMED' && booking.status !== 'CONFIRMED') {
      try {
        const customerEmail = booking.user?.email || booking.guestEmail;
        const customerName = booking.user 
          ? `${booking.user.firstName} ${booking.user.lastName}`
          : booking.guestName || 'Valued Customer';

        if (customerEmail) {
          await this.emailService.sendBookingConfirmationEmail(
            customerEmail,
            customerName,
            {
              id: updatedBooking.id,
              startDate: updatedBooking.bookingItems[0]?.startDate,
              endDate: updatedBooking.bookingItems[0]?.endDate,
              totalPrice: updatedBooking.totalPrice,
              status: updatedBooking.status,
            }
          );
        }
      } catch (error) {
        console.error('Failed to send confirmation email:', error);
      }
    }

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

    await this.emailService.sendBookingCancellationNotification(
      id,
      customerName,
      vehicleName
    );

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