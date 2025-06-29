import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center">
      <div class="flex">
        <button
          *ngFor="let star of [1,2,3,4,5]; let i = index"
          type="button"
          (click)="onStarClick(star)"
          [disabled]="!interactive"
          class="focus:outline-none transition-colors"
          [class.text-yellow-400]="star <= filledStars"
          [class.text-gray-300]="star > filledStars"
          [class.hover:text-yellow-400]="interactive"
          [class.cursor-pointer]="interactive"
          [class.cursor-default]="!interactive">
          <svg class="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </button>
      </div>
      <span *ngIf="showRating" class="ml-2 text-sm text-gray-600">{{ rating }}/5</span>
    </div>
  `,
  styles: []
})
export class StarRatingComponent {
  @Input() rating: number = 0;
  @Input() interactive: boolean = false;
  @Input() showRating: boolean = true;
  @Output() ratingChange = new EventEmitter<number>();

  get filledStars(): number {
    return Math.floor(this.rating);
  }

  onStarClick(star: number): void {
    if (this.interactive) {
      this.ratingChange.emit(star);
    }
  }
} 