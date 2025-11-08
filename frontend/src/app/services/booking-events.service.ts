import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface BookingEvent {
  type: 'booking_created' | 'booking_updated' | 'booking_cancelled';
  payload: any;
}

@Injectable({ providedIn: 'root' })
export class BookingEventsService {
  private readonly API_URL = 'http://localhost:3000/booking/events';
  private eventSource?: EventSource;
  private subject = new Subject<BookingEvent>();

  constructor(private zone: NgZone) {}

  connect(): Observable<BookingEvent> {
    if (this.eventSource) return this.subject.asObservable();

    // Use NgZone to ensure change detection runs on events
    this.eventSource = new EventSource(this.API_URL);

    this.eventSource.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const data = raw?.data ?? raw; // unwrap Nest Sse { data: e }
        this.zone.run(() => this.subject.next(data as BookingEvent));
      } catch (e) {
        // ignore malformed events
      }
    };

    this.eventSource.onerror = () => {
      // Optionally implement backoff/reconnect
    };

    return this.subject.asObservable();
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }
}
