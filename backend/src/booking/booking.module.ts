/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { BookingEventsService } from './booking.events.service';
import { PaymentsModule } from '../payments/payments.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, EmailModule, PaymentsModule, EventsModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
