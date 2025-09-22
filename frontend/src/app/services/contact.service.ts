import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContactMessage {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'unread' | 'read';
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactMessageDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface UpdateContactMessageDto {
  status?: 'unread' | 'read';
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly API_URL = 'https://carbooking-system.onrender.com';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }


  submitContactForm(contactData: CreateContactMessageDto): Observable<ContactMessage> {
    return this.http.post<ContactMessage>(
      `${this.API_URL}/contact`,
      contactData
    );
  }


  getAllContactMessages(): Observable<ContactMessage[]> {
    return this.http.get<ContactMessage[]>(
      `${this.API_URL}/contact`,
      { headers: this.getHeaders() }
    );
  }


  getContactMessageById(id: string): Observable<ContactMessage> {
    return this.http.get<ContactMessage>(
      `${this.API_URL}/contact/${id}`,
      { headers: this.getHeaders() }
    );
  }


  updateContactMessage(id: string, updateData: UpdateContactMessageDto): Observable<ContactMessage> {
    return this.http.patch<ContactMessage>(
      `${this.API_URL}/contact/${id}`,
      updateData,
      { headers: this.getHeaders() }
    );
  }

 
  deleteContactMessage(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_URL}/contact/${id}`,
      { headers: this.getHeaders() }
    );
  }


  getUnreadMessagesCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(
      `${this.API_URL}/contact/unread/count`,
      { headers: this.getHeaders() }
    );
  }
} 