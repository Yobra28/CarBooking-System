import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token ?? ''}`
    });
  }

  getUsers(): Observable<User[]> {
    // Public endpoint on backend; omit Authorization to avoid unnecessary CORS preflight
    const params = { t: Date.now().toString() };
    return this.http.get<User[]>(`${this.API_URL}/users`, { params });
  }

  getMe(): Observable<User & { phone?: string; totalSpent?: number }> {
    return this.http.get<User & { phone?: string; totalSpent?: number }>(`${this.API_URL}/users/me`, { headers: this.getHeaders() });
  }

  submitKyc(files: { driverLicense?: File; nationalId?: File; liveProfile?: File; }): Observable<any> {
    const formData = new FormData();
    if (files.driverLicense) formData.append('driverLicense', files.driverLicense);
    if (files.nationalId) formData.append('nationalId', files.nationalId);
    if (files.liveProfile) formData.append('liveProfile', files.liveProfile);

    return this.http.post(`${this.API_URL}/users/me/kyc`, formData, { headers: this.getHeaders().delete('Content-Type') });
  }

  updateMe(data: Partial<User> & { phone?: string }): Observable<User & { phone?: string }> {
    return this.http.patch<User & { phone?: string }>(`${this.API_URL}/users/me`, data, { headers: this.getHeaders() });
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/users/${id}`, { headers: this.getHeaders() });
  }

  getUserKyc(id: string): Observable<{ driverLicenseUrl: string; nationalIdUrl: string; liveProfileUrl: string; isKycVerified: boolean; kycSubmittedAt: string; kycVerifiedAt?: string }> {
    return this.http.get<any>(`${this.API_URL}/users/${id}/kyc`, { headers: this.getHeaders() });
  }

  approveUserKyc(id: string): Observable<{ message: string; user: any }> {
    return this.http.patch<any>(`${this.API_URL}/users/${id}/kyc/approve`, {}, { headers: this.getHeaders() });
  }

  rejectUserKyc(id: string): Observable<{ message: string; user: any }> {
    return this.http.patch<any>(`${this.API_URL}/users/${id}/kyc/reject`, {}, { headers: this.getHeaders() });
  }
}
