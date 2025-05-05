import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReviewService } from '../../../services/review.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  templateUrl: './admin-reviews.component.html',
  styleUrls: ['./admin-reviews.component.scss']
})
export class AdminReviewsComponent implements OnInit {
  reviews: any[] = [];
  loading = true;
  error = '';
  replyText: { [key: string]: string } = {};
  submittingReply: { [key: string]: boolean } = {};
  replySuccess: { [key: string]: boolean } = {};
  replyError: { [key: string]: string } = {};

  constructor(private reviewService: ReviewService) { }

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading = true;
    this.reviewService.getAllReviews().subscribe({
      next: (response: any) => {
        this.reviews = response.reviews;
        // Initialize reply text field for each review
        this.reviews.forEach(review => {
          if (review.admin_reply) {
            this.replyText[review.review_id] = review.admin_reply.text;
          } else {
            this.replyText[review.review_id] = '';
          }
          this.submittingReply[review.review_id] = false;
          this.replySuccess[review.review_id] = false;
          this.replyError[review.review_id] = '';
        });
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load reviews';
        this.loading = false;
        console.error('Error loading reviews:', err);
      }
    });
  }

  deleteReview(reviewId: string, storeId: string): void {
    if (confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      this.reviewService.deleteReview(storeId, reviewId).subscribe({
        next: () => {
          this.reviews = this.reviews.filter(review => review.review_id !== reviewId);
        },
        error: (err: any) => {
          console.error('Error deleting review:', err);
          alert('Failed to delete review. Please try again.');
        }
      });
    }
  }

  submitReply(reviewId: string): void {
    if (!this.replyText[reviewId] || this.replyText[reviewId].trim() === '') {
      this.replyError[reviewId] = 'Reply cannot be empty';
      return;
    }

    this.submittingReply[reviewId] = true;
    this.replySuccess[reviewId] = false;
    this.replyError[reviewId] = '';

    this.reviewService.submitAdminReply(reviewId, this.replyText[reviewId]).subscribe({
      next: () => {
        this.submittingReply[reviewId] = false;
        this.replySuccess[reviewId] = true;
        
        // Update the review object to reflect the changes
        const reviewIndex = this.reviews.findIndex(r => r.review_id === reviewId);
        if (reviewIndex !== -1) {
          const review = this.reviews[reviewIndex];
          if (!review.admin_reply) {
            review.admin_reply = {
              text: this.replyText[reviewId],
              created_at: new Date(),
              isAdmin: true
            };
          } else {
            review.admin_reply.text = this.replyText[reviewId];
            review.admin_reply.updated_at = new Date();
          }
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.replySuccess[reviewId] = false;
        }, 3000);
      },
      error: (err: any) => {
        this.submittingReply[reviewId] = false;
        this.replyError[reviewId] = err.error?.message || 'Failed to submit reply';
        console.error('Error submitting reply:', err);
      }
    });
  }
}
 