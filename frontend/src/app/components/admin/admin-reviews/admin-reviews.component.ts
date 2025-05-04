import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReviewService } from '../../../services/review.service';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './admin-reviews.component.html',
  styleUrls: ['./admin-reviews.component.scss']
})
export class AdminReviewsComponent implements OnInit {
  reviews: any[] = [];
  loading = true;
  error = '';

  constructor(private reviewService: ReviewService) { }

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading = true;
    this.reviewService.getAllReviews().subscribe({
      next: (response: any) => {
        this.reviews = response.reviews;
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
          this.reviews = this.reviews.filter(review => review._id !== reviewId);
        },
        error: (err: any) => {
          console.error('Error deleting review:', err);
          alert('Failed to delete review. Please try again.');
        }
      });
    }
  }
}
 