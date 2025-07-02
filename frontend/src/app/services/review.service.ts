import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  userId: string;
  vehicleId: string;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  vehicle?: {
    id: string;
    name: string;
    make: string;
    model: string;
  };
}

export interface CreateReviewDto {
  rating: number;
  comment?: string;
  vehicleId: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = `${environment.apiUrl}/reviews`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  createReview(reviewData: CreateReviewDto): Observable<Review> {
    return this.http.post<Review>(this.apiUrl, reviewData, { headers: this.getHeaders() });
  }

  getAllReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(this.apiUrl);
  }

  getUserReviews(userId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/user/${userId}`);
  }

  getCurrentUserReviews(): Observable<Review[]> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return new Observable(subscriber => subscriber.next([]));
    }
    return this.getUserReviews(user.id);
  }

  getVehicleReviews(vehicleId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/vehicle/${vehicleId}`);
  }

  getVehicleRatingStats(vehicleId: string): Observable<ReviewStats> {
    return this.http.get<ReviewStats>(`${this.apiUrl}/vehicle/${vehicleId}/stats`);
  }

  getReview(id: string): Observable<Review> {
    return this.http.get<Review>(`${this.apiUrl}/${id}`);
  }

  updateReview(id: string, reviewData: UpdateReviewDto): Observable<Review> {
    return this.http.patch<Review>(`${this.apiUrl}/${id}`, reviewData, { headers: this.getHeaders() });
  }

  deleteReview(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  hasUserReviewedVehicle(vehicleId: string, reviews: Review[]): boolean {
    const user = this.authService.getCurrentUser();
    return user ? reviews.some(review => review.userId === user.id) : false;
  }

  getUserReviewForVehicle(vehicleId: string, reviews: Review[]): Review | null {
    const user = this.authService.getCurrentUser();
    return user ? reviews.find(review => review.userId === user.id) || null : null;
  }

  generateStars(rating: number): { filled: number; half: number; empty: number } {
    const filled = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - filled - half;
    return { filled, half, empty };
  }

  calculateAverageRating(reviews: Review[]): number {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10;
  }

  getRatingDistribution(reviews: Review[]): { [key: number]: number } {
    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating]++;
      }
    });
    return distribution;
  }
} 