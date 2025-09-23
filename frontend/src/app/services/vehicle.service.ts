import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  category: string;
  transmission: string;
  total: number;
  fuelType: string;
  pricePerDay: number;
  color: string;
  mileage: number;
  images: string;
  address: string;
  city: string;
  postalCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleRequest {
  name: string;
  make: string;
  model: string;
  category: string;
  transmission: string;
  total: number;
  fuelType: string;
  pricePerDay: number;
  color: string;
  mileage: number;
  images: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface UpdateVehicleRequest {
  name?: string;
  make?: string;
  model?: string;
  category?: string;
  transmission?: string;
  total?: number;
  fuelType?: string;
  pricePerDay?: number;
  color?: string;
  mileage?: number;
  images?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private readonly API_URL = 'https://carbooking-system.onrender.com';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getAllVehicles(search?: string): Observable<Vehicle[]> {
    let url = `${this.API_URL}/vehicles`;
    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }
    return this.http.get<Vehicle[]>(url);
  }

  getVehicleById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.API_URL}/vehicles/${id}`);
  }

  getVehicleByName(name: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.API_URL}/vehicles/${name}`);
  }

  createVehicle(vehicleData: CreateVehicleRequest): Observable<{ data: Vehicle; message: string }> {
    return this.http.post<{ data: Vehicle; message: string }>(
      `${this.API_URL}/vehicles`,
      vehicleData,
      { headers: this.getHeaders() }
    );
  }

  updateVehicle(id: string, vehicleData: UpdateVehicleRequest): Observable<Vehicle> {
    return this.http.patch<Vehicle>(
      `${this.API_URL}/vehicles/${id}`,
      vehicleData,
      { headers: this.getHeaders() }
    );
  }

  deleteVehicle(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_URL}/vehicles/${id}`,
      { headers: this.getHeaders() }
    );
  }
} 