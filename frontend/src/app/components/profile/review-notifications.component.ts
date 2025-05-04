import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/review.model';

@Component({
  selector: 'app-review-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notifications-container">
      <h3 class="notifications-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        Responses to Your Reviews
      </h3>
      
      <div *ngIf="loading" class="loading-indicator">
        Loading your reviews with responses...
      </div>
      
      <div *ngIf="error" class="error-message">
        {{ error }}
      </div>
      
      <div *ngIf="!loading && !error && reviews.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 15h8"></path>
          <circle cx="8" cy="9" r="1"></circle>
          <circle cx="16" cy="9" r="1"></circle>
        </svg>
        <p>You don't have any reviews with responses yet.</p>
      </div>
      
      <div *ngIf="!loading && reviews.length > 0" class="notifications-list">
        <div *ngFor="let review of reviews" class="notification-card">
          <div class="notification-header">
            <div class="store-info">
              <h4>{{ review.store_name }}</h4>
              <div class="review-date">Your review from {{ review.created_at | date:'mediumDate' }}</div>
            </div>
            <div class="review-rating">
              <div class="stars">
                <span class="star filled" *ngFor="let i of [].constructor(review.rating)"></span>
                <span class="star" *ngFor="let i of [].constructor(5 - review.rating)"></span>
              </div>
            </div>
          </div>
          
          <div class="review-content">
            <p>{{ review.comment }}</p>
          </div>
          
          <div class="responses-container">
            <h5 class="responses-header">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Responses
            </h5>
            
            <div *ngFor="let reply of review.replies" class="response-item">
              <div class="response-author">
                {{ reply.isAdmin ? 'Admin' : 'Store Owner' }} replied on {{ reply.created_at | date:'mediumDate' }}
                <span *ngIf="reply.updated_at">(edited)</span>
              </div>
              <p>{{ reply.text }}</p>
            </div>
          </div>
          
          <div class="notification-actions">
            <a [routerLink]="['/stores', review.store_id]" class="view-store-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              View Store
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notifications-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .notifications-title {
      display: flex;
      align-items: center;
      font-size: 1.5rem;
      margin-bottom: 20px;
      color: #333;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
      
      svg {
        margin-right: 8px;
        color: #1976d2;
      }
    }
    
    .loading-indicator, .error-message, .empty-state {
      text-align: center;
      padding: 40px 20px;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #666;
      
      svg {
        margin-bottom: 16px;
        color: #ddd;
      }
    }
    
    .error-message {
      color: #d32f2f;
    }
    
    .notification-card {
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      margin-bottom: 20px;
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      }
    }
    
    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px;
      background-color: #f8f9fa;
      border-bottom: 1px solid #eee;
      
      .store-info {
        h4 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          color: #333;
        }
        
        .review-date {
          font-size: 0.8rem;
          color: #777;
        }
      }
      
      .review-rating {
        .stars {
          display: flex;
          
          .star {
            position: relative;
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-left: 2px;
            
            &:before {
              content: '☆';
              color: #ddd;
              font-size: 16px;
            }
            
            &.filled:before {
              content: '★';
              color: #ffc107;
            }
          }
        }
      }
    }
    
    .review-content {
      padding: 16px;
      color: #555;
      background-color: #fff;
      border-bottom: 1px solid #eee;
      
      p {
        margin: 0;
        line-height: 1.5;
      }
    }
    
    .responses-container {
      padding: 16px;
      background-color: #f8fdff;
      
      .responses-header {
        display: flex;
        align-items: center;
        margin: 0 0 12px 0;
        font-size: 1rem;
        color: #1976d2;
        
        svg {
          margin-right: 6px;
        }
      }
      
      .response-item {
        padding: 12px;
        background-color: #e3f2fd;
        border-radius: 6px;
        margin-bottom: 8px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .response-author {
          font-size: 0.85rem;
          font-weight: 500;
          color: #0d47a1;
          margin-bottom: 6px;
          
          span {
            color: #f59e0b;
            font-style: italic;
            margin-left: 4px;
          }
        }
        
        p {
          margin: 0;
          color: #333;
          line-height: 1.4;
        }
      }
    }
    
    .notification-actions {
      display: flex;
      justify-content: flex-end;
      padding: 12px 16px;
      background-color: #fff;
      border-top: 1px solid #eee;
      
      .view-store-btn {
        display: flex;
        align-items: center;
        text-decoration: none;
        color: #1976d2;
        font-size: 0.9rem;
        padding: 6px 12px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
        
        svg {
          margin-right: 6px;
        }
        
        &:hover {
          background-color: rgba(25, 118, 210, 0.1);
        }
      }
    }
    
    @media (max-width: 768px) {
      .notification-header {
        flex-direction: column;
        
        .review-rating {
          margin-top: 10px;
        }
      }
    }
  `]
})
export class ReviewNotificationsComponent implements OnInit {
  reviews: Review[] = [];
  loading: boolean = true;
  error: string = '';
  
  constructor(private reviewService: ReviewService) {}
  
  ngOnInit(): void {
    this.loadReviewsWithReplies();
  }
  
  loadReviewsWithReplies(): void {
    this.loading = true;
    this.error = '';
    
    this.reviewService.getUserReviewsWithReplies().subscribe(
      (data) => {
        this.reviews = data.reviews;
        this.loading = false;
      },
      (err) => {
        this.error = 'Failed to load your reviews with responses. Please try again later.';
        this.loading = false;
        console.error('Error loading review notifications:', err);
      }
    );
  }
} 