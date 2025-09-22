import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UploadResponse {
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private readonly API_URL = 'https://carbooking-system.onrender.com';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  uploadFile(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(
      `${this.API_URL}/cloudinary/upload`,
      formData,
      { headers: this.getHeaders() }
    );
  }

  uploadVehicleWithImage(vehicleData: any, file: File): Observable<any> {
    const formData = new FormData();
    
    
    Object.keys(vehicleData).forEach(key => {
      if (vehicleData[key] !== null && vehicleData[key] !== undefined) {
        formData.append(key, vehicleData[key]);
      }
    });
    
   
    if (file) {
      formData.append('image', file);
    }

    return this.http.post(
      `${this.API_URL}/vehicles/with-image`,
      formData,
      { headers: this.getHeaders() }
    );
  }
} 