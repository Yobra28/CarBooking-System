/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { BookingEventsService } from './booking.events.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [BookingController],
  providers: [BookingService, BookingEventsService],
  exports: [BookingService, BookingEventsService],
})
export class BookingModule {}
