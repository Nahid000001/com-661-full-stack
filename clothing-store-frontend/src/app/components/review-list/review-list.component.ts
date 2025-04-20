// src/app/components/review-list/review-list.component.ts
import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './review-list.component.html',
  styleUrls: ['./review-list.component.scss']
})
export class ReviewListComponent implements OnChanges {
  @Input() reviews: any[] = [];
  @Input() storeId: string = '';
  @Input() isAdmin: boolean = false;
  @Input() isOwner: boolean = false;
  
  replyForm!: FormGroup;
  editForm!: FormGroup;
  replyingTo: string | null = null;
  editingReview: string | null = null;
  error = '';
  isLoggedIn = false;
  currentUser: any = null;

  constructor(
    private formBuilder: FormBuilder,
    private reviewService: ReviewService,
    private authService: AuthService
  ) {
    this.replyForm = this.formBuilder.group({
      reply: ['', Validators.required]
    });
    
    this.editForm = this.formBuilder.group({
      rating: ['', [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', Validators.required]
    });
    
    this.isLoggedIn = this.authService.isLoggedIn();
    if (this.isLoggedIn) {
      this.currentUser = this.authService.currentUserValue;
    }
  }

  ngOnChanges() {
    // Reset forms when reviews change
    this.cancelReply();
    this.cancelEdit();
  }

  startReply(reviewId: string) {
    this.replyingTo = reviewId;
    this.editingReview = null;
    this.replyForm.reset();
  }

  cancelReply() {
    this.replyingTo = null;
    this.replyForm.reset();
  }

  submitReply(reviewId: string) {
    if (this.replyForm.invalid) {
      return;
    }

    const reply = this.replyForm.get('reply')?.value;
    
    this.reviewService.replyToReview(this.storeId, reviewId, reply)
      .subscribe({
        next: () => {
          // Refresh reviews after reply
          this.refreshReviews();
          this.cancelReply();
        },
        error: error => {
          this.error = error.error.message || 'Error submitting reply';
        }
      });
  }

  startEdit(review: any) {
    this.editingReview = review._id;
    this.replyingTo = null;
    this.editForm.patchValue({
      rating: review.rating,
      comment: review.comment
    });
  }

  cancelEdit() {
    this.editingReview = null;
    this.editForm.reset();
  }

  submitEdit(reviewId: string) {
    if (this.editForm.invalid) {
      return;
    }

    const updatedReview = {
      rating: this.editForm.get('rating')?.value,
      comment: this.editForm.get('comment')?.value
    };
    
    this.reviewService.editReview(this.storeId, reviewId, updatedReview)
      .subscribe({
        next: () => {
          this.refreshReviews();
          this.cancelEdit();
        },
        error: error => {
          this.error = error.error.message || 'Error updating review';
        }
      });
  }

  deleteReview(reviewId: string) {
    if (confirm('Are you sure you want to delete this review?')) {
      this.reviewService.deleteReview(this.storeId, reviewId)
        .subscribe({
          next: () => {
            this.refreshReviews();
          },
          error: error => {
            this.error = error.error.message || 'Error deleting review';
          }
        });
    }
  }

  refreshReviews() {
    this.reviewService.getStoreReviews(this.storeId)
      .subscribe({
        next: data => {
          this.reviews = data.reviews;
        },
        error: error => {
          this.error = error.error.message || 'Error refreshing reviews';
        }
      });
  }

  canEditReview(review: any): boolean {
    return this.isLoggedIn && 
           this.currentUser && 
           this.currentUser.username === review.username;
  }

  canDeleteReview(review: any): boolean {
    return this.isLoggedIn && 
           (this.isAdmin || this.isOwner);
  }

  canReplyToReview(): boolean {
    return this.isLoggedIn && 
           (this.isAdmin || this.isOwner);
  }
}