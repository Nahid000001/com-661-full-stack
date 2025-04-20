// src/app/components/review-form/review-form.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReviewService } from '../../services/review.service';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './review-form.component.html',
  styleUrls: ['./review-form.component.scss']
})
export class ReviewFormComponent {
  @Input() storeId: string = '';
  @Output() reviewAdded = new EventEmitter<any>();
  
  reviewForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';

  constructor(
    private formBuilder: FormBuilder,
    private reviewService: ReviewService
  ) {
    this.reviewForm = this.formBuilder.group({
      rating: ['', [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', Validators.required]
    });
  }

  get f() { return this.reviewForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    this.success = '';

    if (this.reviewForm.invalid) {
      return;
    }

    this.loading = true;
    this.reviewService.addReview(this.storeId, {
      rating: this.f['rating'].value,
      comment: this.f['comment'].value
    }).subscribe({
      next: response => {
        this.success = 'Review submitted successfully';
        this.reviewForm.reset();
        this.submitted = false;
        this.loading = false;
        this.reviewAdded.emit(response);
      },
      error: error => {
        this.error = error.error.message || 'Error submitting review';
        this.loading = false;
      }
    });
  }
}