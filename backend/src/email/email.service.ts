/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService
  ) {}

  async sendBookingCancellationNotification(
    bookingId: string,
    customerName: string,
    vehicleName: string,
  ) {
    try {
      // Get all agents
      const agents = await this.prisma.user.findMany({
        where: {
          role: 'AGENT',
          isActive: true,
        },
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      // Send actual emails to all agents
      const emailPromises = agents.map(agent =>
        this.mailerService.sendMail({
          to: agent.email,
          subject: 'Booking Cancellation Notification',
          template: 'booking-cancellation',
          context: {
            agentName: `${agent.firstName} ${agent.lastName}`,
            bookingId,
            customerName,
            vehicleName,
            cancellationDate: new Date().toLocaleDateString(),
          },
        })
      );

      await Promise.all(emailPromises);

      return {
        success: true,
        agentsNotified: agents.length,
        message: `Cancellation notification sent to ${agents.length} agents`,
      };
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBookingConfirmationEmail(
    customerEmail: string,
    customerName: string,
    bookingDetails: any,
  ) {
    try {
      await this.mailerService.sendMail({
        to: customerEmail,
        subject: 'Booking Confirmation - Car Rental',
        template: 'booking-confirmation',
        context: {
          customerName,
          bookingDetails,
          confirmationDate: new Date().toLocaleDateString(),
        },
      });

      return {
        success: true,
        message: 'Booking confirmation email sent',
      };
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetCode: string,
  ) {
    try {
      console.log('Attempting to send password reset email to:', email);
      console.log('Reset code:', resetCode);
      console.log('First name:', firstName);
      
      const result = await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Request - Car Rental',
        template: 'paswordreset',
        context: {
          firstName,
          code: resetCode,
        },
      });
      
      console.log('Email sent successfully:', result);
      console.log('Message ID:', result.messageId);

      return {
        success: true,
        message: 'Password reset email sent successfully',
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
      });
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          command: error.command,
          response: error.response,
        },
      };
    }
  }

  async sendContactConfirmationEmail(
    email: string,
    firstName: string,
    lastName: string,
    subject: string,
    message: string,
  ) {
    try {
      console.log('Sending contact confirmation email to:', email);
      
      const result = await this.mailerService.sendMail({
        to: email,
        subject: 'Thank you for contacting us - Car Rental',
        template: 'contact-confirmation',
        context: {
          firstName,
          lastName,
          subject,
          message,
        },
      });
      
      console.log('Contact confirmation email sent successfully:', result);
      console.log('Message ID:', result.messageId);

      return {
        success: true,
        message: 'Contact confirmation email sent successfully',
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('Error sending contact confirmation email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBookingPendingEmail(
    customerEmail: string,
    customerName: string,
    bookingDetails: any,
  ) {
    try {
      await this.mailerService.sendMail({
        to: customerEmail,
        subject: 'Booking Received - Pending Approval',
        template: 'booking-pending',
        context: {
          customerName,
          bookingDetails,
          submissionDate: new Date().toLocaleDateString(),
        },
      });
      return {
        success: true,
        message: 'Booking pending approval email sent',
      };
    } catch (error) {
      console.error('Error sending booking pending approval email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendContactNotificationToAdminsAndAgents(contactMessage: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    createdAt: Date;
  }) {
    try {
      // Get all admins and agents
      const users = await this.prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'AGENT'] },
          isActive: true,
        },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      const emailPromises = users.map(user =>
        this.mailerService.sendMail({
          to: user.email,
          subject: 'New Contact Message Notification',
          template: 'contact-notification',
          context: {
            agentName: `${user.firstName} ${user.lastName}`,
            firstName: contactMessage.firstName,
            lastName: contactMessage.lastName,
            email: contactMessage.email,
            phone: contactMessage.phone,
            subject: contactMessage.subject,
            message: contactMessage.message,
            messageId: contactMessage.id,
            submittedAt: contactMessage.createdAt.toLocaleString(),
          },
        })
      );

      await Promise.all(emailPromises);
      return {
        success: true,
        usersNotified: users.length,
        message: `Contact notification sent to ${users.length} admins/agents`,
      };
    } catch (error) {
      console.error('Error sending contact notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBookingNotificationToAdminsAndAgents(booking: {
    id: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    status: string;
    createdAt: Date;
  }, customer: {
    name: string;
    email: string;
    phone?: string;
  }) {
    try {
      // Get all admins and agents
      const users = await this.prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'AGENT'] },
          isActive: true,
        },
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      const emailPromises = users.map(user =>
        this.mailerService.sendMail({
          to: user.email,
          subject: 'New Booking Notification',
          template: 'booking-admin-notification',
          context: {
            adminName: `${user.firstName} ${user.lastName}`,
            booking: {
              id: booking.id,
              startDate: booking.startDate,
              endDate: booking.endDate,
              totalPrice: booking.totalPrice,
              status: booking.status,
            },
            customer: {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
            },
            submittedAt: booking.createdAt.toLocaleString(),
          },
        })
      );

      await Promise.all(emailPromises);
      return {
        success: true,
        usersNotified: users.length,
        message: `Booking notification sent to ${users.length} admins/agents`,
      };
    } catch (error) {
      console.error('Error sending booking notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
