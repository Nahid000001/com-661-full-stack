// src/app/components/store-detail/store-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { ReviewListComponent } from '../review-list/review-list.component';
import { ReviewFormComponent } from '../review-form/review-form.component';
import { Router} from '@angular/router';

@Component({
  selector: 'app-store-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReviewListComponent, ReviewFormComponent],
  templateUrl: './store-detail.component.html',
  styleUrls: ['./store-detail.component.scss']
})
export class StoreDetailComponent implements OnInit {
  storeId: string = '';
  store: any = null;
  reviews: any[] = [];
  loading = false;
  error = '';
  isLoggedIn = false;
  isOwner = false;
  isAdmin = false;
  
  // New properties for enhanced UI
  currentImageIndex = 0;
  sortOption = 'newest';
  Math = Math; // Make Math available in the template
  
  // Store images for the gallery - in a real app, these would come from the API
  storeImages = [
    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1542060748-10c28b62716f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storeService: StoreService,
    private reviewService: ReviewService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.storeId = id;
        this.loadStoreDetails();
        this.loadReviews();
      }
    });
    
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (this.isLoggedIn) {
      const user = this.authService.currentUserValue;
      if (user) {
        this.isAdmin = user?.role === 'admin';
      }
    }
  }

  loadStoreDetails() {
    this.loading = true;
    this.storeService.getStoreById(this.storeId)
      .subscribe({
        next: data => {
          this.store = data;
          
          if (this.isLoggedIn) {
            const user = this.authService.currentUserValue;
            this.isOwner = !!user && user.username === this.store.owner;
          }
          
          this.loading = false;
        },
        error: error => {
          this.error = error.error?.message || 'Error loading store details';
          this.loading = false;
        }
      });
  }

  // Gallery functionality
  getMainImage(): string {
    return this.storeImages[this.currentImageIndex];
  }

  setMainImage(index: number): void {
    this.currentImageIndex = index;
  }

  // Review sorting functionality
  sortReviews(): void {
    switch(this.sortOption) {
      case 'newest':
        this.reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        this.reviews.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'highest':
        this.reviews.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        this.reviews.sort((a, b) => a.rating - b.rating);
        break;
    }
  }

  // Style utility
  getTypeBadgeClass(type: string): string {
    switch(type.toLowerCase()) {
      case 'retail':
        return 'bg-primary';
      case 'online':
        return 'bg-info';
      case 'wholesale':
        return 'bg-success';
      case 'outlet':
        return 'bg-warning';
      case 'boutique':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  updateStore() {
    if (!this.store) return;
    
    // You'd implement a form or dialog here
    const updatedData = {
      company_name: this.store.company_name,
      title: this.store.title,
      description: this.store.description,
      location: this.store.location,
      work_type: this.store.work_type
    };
    
    this.storeService.updateStore(this.storeId, updatedData)
      .subscribe({
        next: () => {
          this.loadStoreDetails();
        },
        error: error => {
          this.error = error.error?.message || 'Error updating store';
        }
      });
  }

  deleteStore() {
    if (confirm('Are you sure you want to delete this store?')) {
      this.storeService.deleteStore(this.storeId)
        .subscribe({
          next: () => {
            this.router.navigate(['/stores']);
          },
          error: error => {
            this.error = error.error?.message || 'Error deleting store';
          }
        });
    }
  }

  loadReviews() {
    this.reviewService.getStoreReviews(this.storeId)
      .subscribe({
        next: data => {
          this.reviews = data.reviews;
          this.sortReviews(); // Apply default sorting
        },
        error: error => {
          console.error('Error loading reviews', error);
        }
      });
  }

  onReviewAdded(review: any) {
    this.loadReviews();
  }

  getEmailAddress(): string {
    if (!this.store || !this.store.company_name) return 'contact@example.com';
    
    // Convert the store name to lowercase and replace spaces with dots
    const storeName = this.store.company_name.toLowerCase().split(' ').join('.');
    return `${storeName}@example.com`;
  }
}