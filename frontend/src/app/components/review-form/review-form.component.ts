// src/app/components/review-form/review-form.component.ts
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReviewService } from '../../services/review.service';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './review-form.component.html',
  styleUrls: ['./review-form.component.scss']
})
export class ReviewFormComponent implements OnInit {
  @Input() storeId: string = '';
  @Output() reviewAdded = new EventEmitter<any>();
  
  reviewForm: FormGroup;
  loading = false;
  submitted = false;
  success = '';
  error = '';
  
  // Star rating properties
  hoverRating = 0;
  ratingLabels = [
    'Poor',
    'Fair',
    'Good',
    'Very Good',
    'Excellent'
  ];

  constructor(
    private formBuilder: FormBuilder,
    private reviewService: ReviewService
  ) {
    this.reviewForm = this.formBuilder.group({
      rating: ['', [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    // Initialize form
  }

  // Convenience getter for easy access to form fields
  get f() { return this.reviewForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    this.success = '';
    
    // Stop here if form is invalid
    if (this.reviewForm.invalid) {
      return;
    }
    
    this.loading = true;
    
    // Ensure reviewData matches the expected type
    const reviewData = this.reviewForm.value;
    
    // Add a retry attempt counter
    let retryCount = 0;
    const maxRetries = 2;
    
    const submitReview = () => {
      this.reviewService.addReview(this.storeId, reviewData)
        .subscribe({
          next: (response) => {
            this.loading = false;
            this.success = 'Review submitted successfully!';
            this.reviewForm.reset();
            this.submitted = false;
            this.reviewAdded.emit(response);
            
            // Clear success message after 3 seconds
            setTimeout(() => {
              this.success = '';
            }, 3000);
          },
          error: (error) => {
            console.error('Review submission error:', error);
            
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Retrying review submission (${retryCount}/${maxRetries})...`);
              // Wait 1 second before retrying
              setTimeout(() => submitReview(), 1000);
              return;
            }
            
            this.loading = false;
            this.error = error.error?.message || 'Error submitting review. Please try again.';
            
            // Clear error message after 5 seconds
            setTimeout(() => {
              this.error = '';
            }, 5000);
          }
        });
    };
    
    submitReview();
  }
  
  // Star rating methods
  setRating(value: number) {
    this.reviewForm.get('rating')?.setValue(value);
  }
  
  getRatingText(rating: number): string {
    return this.ratingLabels[Math.floor(rating) - 1] || '';
  }
}