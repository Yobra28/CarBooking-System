import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  async create(createContactDto: CreateContactDto) {
    // Create the contact message in the database
    const contactMessage = await this.prisma.contactMessage.create({
      data: {
        firstName: createContactDto.firstName,
        lastName: createContactDto.lastName,
        email: createContactDto.email,
        phone: createContactDto.phone,
        subject: createContactDto.subject,
        message: createContactDto.message,
        status: 'unread',
      },
    });

    // Send confirmation email to the user
    try {
      await this.emailService.sendContactConfirmationEmail(
        createContactDto.email,
        createContactDto.firstName,
        createContactDto.lastName,
        createContactDto.subject,
        createContactDto.message,
      );
      console.log('Contact confirmation email sent successfully');
    } catch (error) {
      console.error('Failed to send contact confirmation email:', error);
      // Don't throw error here - we still want to save the contact message
      // even if email sending fails
    }

    // Send notification email to all admins and agents
    try {
      await this.emailService.sendContactNotificationToAdminsAndAgents({
        id: contactMessage.id,
        firstName: contactMessage.firstName,
        lastName: contactMessage.lastName,
        email: contactMessage.email,
        phone: contactMessage.phone ?? undefined,
        subject: contactMessage.subject,
        message: contactMessage.message,
        createdAt: contactMessage.createdAt,
      });
      console.log('Contact notification email sent to admins/agents');
    } catch (error) {
      console.error('Failed to send contact notification email:', error);
      // Don't throw error here - we still want to save the contact message
    }

    return contactMessage;
  }

  async findAll() {
    return this.prisma.contactMessage.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const contactMessage = await this.prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!contactMessage) {
      throw new NotFoundException(`Contact message with ID ${id} not found`);
    }

    return contactMessage;
  }

  async update(id: string, updateData: { status?: 'unread' | 'read' }) {
    const contactMessage = await this.prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!contactMessage) {
      throw new NotFoundException(`Contact message with ID ${id} not found`);
    }

    return this.prisma.contactMessage.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const contactMessage = await this.prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!contactMessage) {
      throw new NotFoundException(`Contact message with ID ${id} not found`);
    }

    await this.prisma.contactMessage.delete({
      where: { id },
    });

    return { message: 'Contact message deleted successfully' };
  }

  async getUnreadCount() {
    const count = await this.prisma.contactMessage.count({
      where: {
        status: 'unread',
      },
    });

    return { count };
  }
} 