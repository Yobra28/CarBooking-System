import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReviewService, Review, CreateReviewDto } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { StarRatingComponent } from '../star-rating/star-rating.component';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, StarRatingComponent],
  template: `
    <div class="review-section bg-white rounded-lg shadow-md p-6 mb-6">
      <!-- Review Statistics -->
      <div class="mb-6">
        <h3 class="text-xl font-semibold mb-4">Customer Reviews</h3>
        <div class="flex items-center mb-4">
          <div class="flex items-center mr-4">
            <span class="text-3xl font-bold text-blue-600">{{ averageRating }}</span>
            <span class="text-gray-500 ml-2">/ 5</span>
          </div>
          <div class="flex items-center">
            <app-star-rating 
              [rating]="averageRating" 
              [interactive]="false" 
              [showRating]="false">
            </app-star-rating>
            <span class="text-gray-600 ml-2">({{ reviews.length }} reviews)</span>
          </div>
        </div>
      </div>

      <!-- Review Form (if user is logged in and hasn't reviewed) -->
      <div *ngIf="isLoggedIn && !hasUserReviewed" class="mb-6 p-4 border border-gray-200 rounded-lg">
        <h4 class="text-lg font-medium mb-4">Write a Review</h4>
        <form [formGroup]="reviewForm" (ngSubmit)="submitReview()" class="space-y-4">
          <!-- Star Rating -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <app-star-rating 
              [rating]="selectedRating" 
              [interactive]="true" 
              [showRating]="true"
              (ratingChange)="setRating($event)">
            </app-star-rating>
          </div>

          <!-- Comment -->
          <div>
            <label for="comment" class="block text-sm font-medium text-gray-700 mb-2">Comment (optional)</label>
            <textarea
              id="comment"
              formControlName="comment"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share your experience with this vehicle..."></textarea>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="reviewForm.invalid || isSubmitting || selectedRating === 0"
            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <span *ngIf="isSubmitting">Submitting...</span>
            <span *ngIf="!isSubmitting">Submit Review</span>
          </button>
        </form>
      </div>

      <!-- User's Existing Review -->
      <div *ngIf="userReview" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 class="text-lg font-medium mb-2">Your Review</h4>
        <div class="flex items-center mb-2">
          <app-star-rating 
            [rating]="userReview.rating" 
            [interactive]="false" 
            [showRating]="true">
          </app-star-rating>
        </div>
        <p *ngIf="userReview.comment" class="text-gray-700">{{ userReview.comment }}</p>
        <p class="text-sm text-gray-500 mt-2">{{ userReview.createdAt | date:'mediumDate' }}</p>
      </div>

      <!-- All Reviews List -->
      <div class="space-y-4">
        <h4 class="text-lg font-medium">All Reviews</h4>
        <div *ngIf="reviews.length === 0" class="text-gray-500 text-center py-8">
          No reviews yet. Be the first to review this vehicle!
        </div>
        <div *ngFor="let review of reviews" class="border-b border-gray-200 pb-4 last:border-b-0">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <app-star-rating 
                [rating]="review.rating" 
                [interactive]="false" 
                [showRating]="true">
              </app-star-rating>
            </div>
            <span class="text-sm text-gray-500">{{ review.createdAt | date:'mediumDate' }}</span>
          </div>
          <p *ngIf="review.comment" class="text-gray-700 mb-2">{{ review.comment }}</p>
          <p class="text-sm text-gray-600">
            By {{ review.user?.firstName }} {{ review.user?.lastName }}
          </p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ReviewComponent implements OnInit {
  @Input() vehicleId!: string;
  @Output() reviewSubmitted = new EventEmitter<void>();

  reviews: Review[] = [];
  userReview: Review | null = null;
  averageRating = 0;
  isLoggedIn = false;
  hasUserReviewed = false;
  isSubmitting = false;
  selectedRating = 0;
  reviewForm: FormGroup;

  constructor(
    private reviewService: ReviewService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.reviewForm = this.fb.group({
      comment: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    this.loadReviews();
  }

  loadReviews(): void {
    this.reviewService.getVehicleReviews(this.vehicleId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.averageRating = this.reviewService.calculateAverageRating(reviews);
        this.hasUserReviewed = this.reviewService.hasUserReviewedVehicle(this.vehicleId, reviews);
        this.userReview = this.reviewService.getUserReviewForVehicle(this.vehicleId, reviews);
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
      }
    });
  }

  setRating(rating: number): void {
    this.selectedRating = rating;
  }

  submitReview(): void {
    if (this.reviewForm.valid && this.selectedRating > 0) {
      this.isSubmitting = true;
      
      const reviewData: CreateReviewDto = {
        rating: this.selectedRating,
        comment: this.reviewForm.get('comment')?.value || undefined,
        vehicleId: this.vehicleId
      };

      this.reviewService.createReview(reviewData).subscribe({
        next: (review) => {
          this.isSubmitting = false;
          this.selectedRating = 0;
          this.reviewForm.reset();
          this.loadReviews();
          this.reviewSubmitted.emit();
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error submitting review:', error);
          // Handle error (show toast notification, etc.)
        }
      });
    }
  }
} 