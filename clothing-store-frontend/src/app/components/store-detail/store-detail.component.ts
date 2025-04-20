// src/app/components/store-detail/store-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { ReviewListComponent } from '../review-list/review-list.component';
import { ReviewFormComponent } from '../review-form/review-form.component';
import { Router} from '@angular/router';

@Component({
  selector: 'app-store-detail',
  standalone: true,
  imports: [CommonModule, ReviewListComponent, ReviewFormComponent],
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
      // You'll need to decode the JWT token to get the role
      // This is a simplified example
      this.isAdmin = user.role === 'admin';
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
            this.isOwner = user.username === this.store.owner;
          }
          
          this.loading = false;
        },
        error: error => {
          this.error = error.error.message || 'Error loading store details';
          this.loading = false;
        }
      });
  }

  // In store-detail.component.ts
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
        this.error = error.error.message || 'Error updating store';
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
          this.error = error.error.message || 'Error deleting store';
        }
      });
  }
}

  loadReviews() {
    this.reviewService.getStoreReviews(this.storeId)
      .subscribe({
        next: data => {
          this.reviews = data.reviews;
        },
        error: error => {
          console.error('Error loading reviews', error);
        }
      });
  }

  onReviewAdded(review: any) {
    this.loadReviews();
  }
}