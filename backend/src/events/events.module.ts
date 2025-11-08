/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { BookingEventsService } from '../booking/booking.events.service';

@Module({
  providers: [BookingEventsService],
  exports: [BookingEventsService],
})
export class EventsModule {}
