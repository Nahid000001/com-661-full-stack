// src/app/components/review-list/review-list.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { Review } from '../../models/review.model';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './review-list.component.html',
  styleUrls: ['./review-list.component.scss']
})
export class ReviewListComponent implements OnInit {
  @Input() storeId: string = '';
  @Input() reviews: Review[] = [];
  @Input() isAdmin: boolean = false;
  @Input() isOwner: boolean = false;
  @Output() reviewUpdated = new EventEmitter<boolean>();
  
  error: string = '';
  editingReview: string | null = null;
  replyingTo: string | null = null;
  editForm: FormGroup;
  replyForm: FormGroup;
  
  // Pagination properties
  currentPage: number = 1;
  totalPages: number = 1;
  pageSize: number = 5;
  
  constructor(
    private reviewService: ReviewService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      rating: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10)]]
    });
    
    this.replyForm = this.fb.group({
      reply: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.loadReviews();
  }
  
  loadReviews(): void {
    // Only load reviews from the service if no reviews were provided via @Input
    if (this.reviews.length === 0) {
      this.reviewService.getStoreReviews(this.storeId, this.currentPage, this.pageSize)
        .subscribe(
          (data: { reviews: Review[], total: number, totalPages?: number }) => {
            this.reviews = data.reviews;
            this.totalPages = data.totalPages || Math.ceil(data.total / this.pageSize);
          },
          (err: any) => {
            this.error = 'Failed to load reviews. Please try again later.';
            console.error(err);
          }
        );
    }
  }
  
  canEditReview(review: Review): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser && (currentUser.id === review.userId || this.isAdmin);
  }
  
  canDeleteReview(review: Review): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser && (currentUser.id === review.userId || this.isAdmin);
  }
  
  canReplyToReview(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser && this.isOwner;
  }
  
  startEdit(review: Review): void {
    this.editingReview = review._id;
    this.editForm.patchValue({
      rating: review.rating,
      comment: review.comment
    });
  }
  
  cancelEdit(): void {
    this.editingReview = null;
    this.editForm.reset();
  }
  
  submitEdit(reviewId: string): void {
    if (this.editForm.invalid) return;
    
    this.reviewService.editReview(this.storeId, reviewId, this.editForm.value)
      .subscribe(
        () => {
          this.editingReview = null;
          this.loadReviews();
          this.reviewUpdated.emit(true);
        },
        (err: any) => {
          this.error = 'Failed to update review. Please try again.';
          console.error(err);
        }
      );
  }
  
  deleteReview(reviewId: string): void {
    if (confirm('Are you sure you want to delete this review?')) {
      this.reviewService.deleteReview(this.storeId, reviewId)
        .subscribe(
          () => {
            this.loadReviews();
            this.reviewUpdated.emit(true);
          },
          (err: any) => {
            this.error = 'Failed to delete review. Please try again.';
            console.error(err);
          }
        );
    }
  }
  
  startReply(reviewId: string): void {
    this.replyingTo = reviewId;
    const review = this.reviews.find(r => r._id === reviewId);
    
    // Check if the review has existing replies
    if (review && review.replies && review.replies.length > 0) {
      this.replyForm.patchValue({ reply: review.replies[0].text });
    } 
    // Fallback to old reply structure if present
    else if (review && review.reply) {
      this.replyForm.patchValue({ reply: review.reply.text });
    } 
    else {
      this.replyForm.reset();
    }
  }
  
  cancelReply(): void {
    this.replyingTo = null;
    this.replyForm.reset();
  }
  
  submitReply(reviewId: string): void {
    if (this.replyForm.invalid) return;
    
    this.reviewService.replyToReview(this.storeId, reviewId, this.replyForm.value.reply)
      .subscribe(
        () => {
          this.replyingTo = null;
          this.loadReviews();
          this.reviewUpdated.emit(true);
        },
        (err: any) => {
          this.error = 'Failed to submit reply. Please try again.';
          console.error(err);
        }
      );
  }
  
  getInitials(userName: string): string {
    if (!userName) return '';
    
    return userName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
  
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    this.loadReviews();
  }
}