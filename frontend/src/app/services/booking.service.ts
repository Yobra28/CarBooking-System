import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Booking {
  id: string;
  userId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  bookingItems?: {
    id: string;
    startDate: string;
    endDate: string;
    price: number;
    vehicle: {
      id: string;
      name: string;
      make: string;
      model: string;
      images: string;
    };
  }[];

  vehicle?: {
    id: string;
    name: string;
    brand: string;
    model: string;
    images: string;
  };
}

export interface CreateBookingRequest {
  vehicleId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
}

export interface UpdateBookingRequest {
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  totalPrice?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly API_URL = 'http://localhost:3000';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token);
    
    if (!token) {
      console.warn('No token found in localStorage');
    }
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  createBooking(bookingData: CreateBookingRequest): Observable<Booking> {
    return this.http.post<Booking>(
      `${this.API_URL}/booking`,
      bookingData,
      { headers: this.getHeaders() }
    );
  }

  getAllBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(
      `${this.API_URL}/booking`,
      { headers: this.getHeaders() }
    );
  }

  getBookingsByUser(userId: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(
      `${this.API_URL}/booking/user/${userId}`,
      { headers: this.getHeaders() }
    );
  }

  getBookingById(id: string): Observable<Booking> {
    return this.http.get<Booking>(
      `${this.API_URL}/booking/${id}`,
      { headers: this.getHeaders() }
    );
  }

  updateBooking(id: string, bookingData: UpdateBookingRequest): Observable<Booking> {
    return this.http.patch<Booking>(
      `${this.API_URL}/booking/${id}`,
      bookingData,
      { headers: this.getHeaders() }
    );
  }

  cancelBooking(id: string): Observable<Booking> {
    return this.http.post<Booking>(
      `${this.API_URL}/booking/${id}/cancel`,
      {},
      { headers: this.getHeaders() }
    );
  }

  deleteBooking(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_URL}/booking/${id}`,
      { headers: this.getHeaders() }
    );
  }
} 