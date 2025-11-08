/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface BookingEvent {
  type: 'booking_created' | 'booking_updated' | 'booking_cancelled';
  payload: any;
}

@Injectable()
export class BookingEventsService {
  private subject = new Subject<BookingEvent>();

  asObservable() {
    return this.subject.asObservable();
  }

  publish(event: BookingEvent) {
    this.subject.next(event);
  }
}
