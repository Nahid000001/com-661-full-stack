// src/app/components/review-list/review-list.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { Review } from '../../models/review.model';
import { UserService } from '../../services/user.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

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
  @Output() reviewUpdated = new EventEmitter<{updated: boolean, review?: Review}>();
  
  error: string = '';
  editingReview: string | null = null;
  replyingTo: string | null = null;
  editingReply: {reviewId: string, replyId: string} | null = null;
  editForm: FormGroup;
  replyForm: FormGroup;
  
  // Pagination properties
  currentPage: number = 1;
  totalPages: number = 1;
  pageSize: number = 5;
  
  // Sorting
  currentSort: string = 'newest';
  
  constructor(
    private reviewService: ReviewService,
    private authService: AuthService,
    private userService: UserService,
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
        .pipe(
          // Map the reviews to add userName if it doesn't exist
          mergeMap(data => {
            const reviews = data.reviews || [];
            // Ensure dates are properly formatted
            const processedReviews = reviews.map(review => {
              // Convert string dates to Date objects
              if (review.created_at && typeof review.created_at === 'string') {
                review.created_at = new Date(review.created_at);
              }
              if (review.updated_at && typeof review.updated_at === 'string') {
                review.updated_at = new Date(review.updated_at);
              }
              
              // Process replies if they exist
              if (review.replies && Array.isArray(review.replies)) {
                review.replies = review.replies.map(reply => {
                  if (reply.created_at && typeof reply.created_at === 'string') {
                    reply.created_at = new Date(reply.created_at);
                  }
                  if (reply.updated_at && typeof reply.updated_at === 'string') {
                    reply.updated_at = new Date(reply.updated_at);
                  }
                  return reply;
                });
              }
              
              // Process old reply format if it exists
              if (review.reply && review.reply.createdAt && typeof review.reply.createdAt === 'string') {
                review.reply.createdAt = new Date(review.reply.createdAt);
              }
              
              return review;
            });
            
            // For each review that doesn't have a userName, try to get the user info
            const reviewsWithUserNames = processedReviews.map(review => {
              // If the review already has userName, use it
              if (review.userName) {
                return of(review);
              }
              
              // Get userId safely - make sure it's a string
              const userId = (review.userId || review.user) as string;
              if (!userId) {
                return of({
                  ...review,
                  userName: 'Anonymous'
                });
              }
              
              // Otherwise, try to get the userName from the user ID
              return this.userService.getUserById(userId)
                .pipe(
                  map(user => {
                    // Add the userName to the review
                    return {
                      ...review,
                      userName: user.email || user.username || userId || 'Anonymous'
                    };
                  }),
                  catchError(() => {
                    // If we can't get the user info, use the user ID as the name
                    return of({
                      ...review,
                      userName: userId || 'Anonymous'
                    });
                  })
                );
            });
            
            // Wait for all the user info requests to complete
            return forkJoin(reviewsWithUserNames).pipe(
              map(updatedReviews => ({
                reviews: updatedReviews, 
                total: data.total,
                totalPages: data.totalPages || Math.ceil(data.total / (data.pageSize || this.pageSize))
              })),
              catchError(() => of({
                reviews: processedReviews.map(r => ({ 
                  ...r, 
                  userName: r.userName || r.userId || r.user || 'Anonymous' 
                })),
                total: data.total,
                totalPages: data.totalPages || Math.ceil(data.total / (data.pageSize || this.pageSize))
              }))
            );
          })
        )
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
    } else {
      // If reviews are provided via Input, ensure they all have userName and proper date handling
      this.reviews = this.reviews.map(r => {
        // Ensure dates are Date objects
        if (r.created_at && typeof r.created_at === 'string') {
          r.created_at = new Date(r.created_at);
        }
        if (r.updated_at && typeof r.updated_at === 'string') {
          r.updated_at = new Date(r.updated_at);
        }
        
        // Process replies
        if (r.replies && Array.isArray(r.replies)) {
          r.replies = r.replies.map(reply => {
            if (reply.created_at && typeof reply.created_at === 'string') {
              reply.created_at = new Date(reply.created_at);
            }
            if (reply.updated_at && typeof reply.updated_at === 'string') {
              reply.updated_at = new Date(reply.updated_at);
            }
            return reply;
          });
        }
        
        // Process old reply format
        if (r.reply && r.reply.createdAt && typeof r.reply.createdAt === 'string') {
          r.reply.createdAt = new Date(r.reply.createdAt);
        }
        
        return {
          ...r,
          userName: r.userName || r.userId || r.user || 'Anonymous'
        };
      });
    }
  }
  
  canEditReview(review: Review): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;
    
    // If user is admin or store owner, they should reply instead of edit
    if (this.isAdmin || this.isOwner) return false;
    
    // Regular users can only edit their own reviews
    return currentUser.id === review.userId || currentUser.id === review.user;
  }
  
  canDeleteReview(review: Review): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;
    
    // Admins can delete any review
    if (this.isAdmin) return true;
    
    // Store owners can delete reviews on their stores
    if (this.isOwner) return true;
    
    // Regular users can only delete their own reviews
    return currentUser.id === review.userId || currentUser.id === review.user;
  }
  
  canReplyToReview(): boolean {
    // Admin or store owner can reply to reviews, this is simplified since isAdmin and isOwner
    // are already passed from the parent component
    return this.isAdmin || this.isOwner;
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
        (updatedReview) => {
          // Find the review in the array and update it
          const reviewIndex = this.reviews.findIndex(r => r._id === reviewId);
          if (reviewIndex !== -1) {
            // Update the specific fields that were edited
            this.reviews[reviewIndex].rating = this.editForm.value.rating;
            this.reviews[reviewIndex].comment = this.editForm.value.comment;
            this.reviews[reviewIndex].updated_at = new Date();
            
            // Emit event to notify parent component about the update with the review data
            this.reviewUpdated.emit({
              updated: true,
              review: this.reviews[reviewIndex]
            });
          } else {
            this.reviewUpdated.emit({updated: true});
          }
          
          this.editingReview = null;
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
            this.reviewUpdated.emit({updated: true});
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
    
    const replyText = this.replyForm.get('reply')?.value;
    if (!replyText) return;
    
    // Clear previous errors
    this.error = '';
    
    // Get user ID and ensure it's not null
    const userId = this.authService.getUserId() || 'unknown';
    
    this.reviewService.replyToReview(this.storeId, reviewId, replyText, this.isAdmin)
      .subscribe({
        next: (response) => {
          console.log('Reply successful:', response);
          
          // Find the review in the array and update it
          const reviewIndex = this.reviews.findIndex(r => r._id === reviewId);
          if (reviewIndex !== -1) {
            // If we received a full review object with replies, use that
            if (response && response.replies) {
              this.reviews[reviewIndex] = response;
            } 
            // Otherwise just update the replies array
            else {
              // If the review doesn't have replies array, create it
              if (!this.reviews[reviewIndex].replies) {
                this.reviews[reviewIndex].replies = [];
              }
              
              // Add the new reply to the review
              const newReply = {
                reply_id: new Date().getTime().toString(), // Temporary ID until we get the real one
                text: replyText,
                user: userId,
                isAdmin: this.isAdmin,
                created_at: new Date()
              };
              
              this.reviews[reviewIndex].replies.push(newReply);
            }
            
            // Reset form and exit reply mode
            this.replyForm.reset();
            this.replyingTo = null;
            
            // Notify parent component about the update
            this.reviewUpdated.emit({
              updated: true,
              review: this.reviews[reviewIndex]
            });
          } else {
            // If review not found, reload all reviews
            this.loadReviews();
          }
        },
        error: (error) => {
          this.error = error.message || 'Failed to reply to review. Please try again.';
          console.error('Error replying to review:', error);
        }
      });
  }
  
  getInitials(userName: string | undefined): string {
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
  
  sortReviews(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.currentSort = selectElement.value;
    
    switch (this.currentSort) {
      case 'newest':
        this.reviews.sort((a, b) => {
          const dateA = new Date(a.created_at || a.updated_at || 0).getTime();
          const dateB = new Date(b.created_at || b.updated_at || 0).getTime();
          return dateB - dateA; // Descending - newest first
        });
        break;
        
      case 'oldest':
        this.reviews.sort((a, b) => {
          const dateA = new Date(a.created_at || a.updated_at || 0).getTime();
          const dateB = new Date(b.created_at || b.updated_at || 0).getTime();
          return dateA - dateB; // Ascending - oldest first
        });
        break;
        
      case 'highest':
        this.reviews.sort((a, b) => b.rating - a.rating); // Descending - highest first
        break;
        
      case 'lowest':
        this.reviews.sort((a, b) => a.rating - b.rating); // Ascending - lowest first
        break;
    }
  }
  
  canEditReply(reply: any): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;
    
    // If user is admin, they can edit any reply made by an admin
    if (this.isAdmin && reply.isAdmin) return true;
    
    // If user is store owner, they can edit any reply made by a store owner
    if (this.isOwner && !reply.isAdmin) return true;
    
    return false;
  }
  
  canDeleteReply(reply: any): boolean {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) return false;
    
    // Admins can delete any reply
    if (this.isAdmin) return true;
    
    // Store owners can only delete their own replies (non-admin replies)
    if (this.isOwner && !reply.isAdmin) return true;
    
    return false;
  }
  
  startEditReply(reviewId: string, reply: any): void {
    this.editingReply = { reviewId, replyId: reply.reply_id };
    this.replyForm.patchValue({ reply: reply.text });
  }
  
  cancelEditReply(): void {
    this.editingReply = null;
    this.replyForm.reset();
  }
  
  submitEditReply(): void {
    if (!this.editingReply || this.replyForm.invalid) return;
    
    const { reviewId, replyId } = this.editingReply;
    
    this.reviewService.editReplyToReview(this.storeId, reviewId, replyId, this.replyForm.value.reply)
      .subscribe(
        () => {
          this.editingReply = null;
          this.loadReviews();
          this.reviewUpdated.emit({updated: true});
        },
        (err: any) => {
          this.error = 'Failed to update reply. Please try again.';
          console.error(err);
        }
      );
  }
  
  deleteReply(reviewId: string, replyId: string): void {
    if (confirm('Are you sure you want to delete this reply?')) {
      this.reviewService.deleteReplyToReview(this.storeId, reviewId, replyId)
        .subscribe(
          () => {
            this.loadReviews();
            this.reviewUpdated.emit({updated: true});
          },
          (err: any) => {
            this.error = 'Failed to delete reply. Please try again.';
            console.error(err);
          }
        );
    }
  }
}