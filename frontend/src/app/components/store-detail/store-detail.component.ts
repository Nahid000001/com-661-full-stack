// src/app/components/store-detail/store-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { ReviewListComponent } from '../review-list/review-list.component';
import { ReviewFormComponent } from '../review-form/review-form.component';
import { StoreMapComponent } from '../store-map/store-map.component';

@Component({
  selector: 'app-store-detail',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    ReviewListComponent,
    ReviewFormComponent,
    StoreMapComponent
  ],
  templateUrl: './store-detail.component.html',
  styleUrls: ['./store-detail.component.scss'],
  styles: [`
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1050;
    }
    
    .modal.show {
      display: block;
    }
    
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1040;
    }
    
    .modal-dialog {
      position: relative;
      margin: 1.75rem auto;
      max-width: 500px;
      z-index: 1060;
    }
  `]
})
export class StoreDetailComponent implements OnInit {
  storeId: string = '';
  store: any = null;
  loading: boolean = true;
  error: string = '';
  reviews: any[] = [];
  isLoggedIn: boolean = false;
  isAdmin: boolean = false;
  isOwner: boolean = false;
  sortOption: string = 'newest';
  currentImageIndex: number = 0;
  
  // Modal properties
  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
  showEditForm: boolean = false;
  editForm: FormGroup;
  updating: boolean = false;
  deleting: boolean = false;
  formError: string = '';
  deleteError: string = '';
  
  // Store image placeholders
  storeImages = [
    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1542060748-10c28b62716f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
  ];
  
  // Images for specific stores
  storeImagesByName: {[key: string]: string[]} = {
    'Urban Threads': [
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
      'https://images.unsplash.com/photo-1567401893414-91b2a97e5b52?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
      'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1587&q=80',
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    ]
  };
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storeService: StoreService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    // Reset modal states on component initialization
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.showEditForm = false;
    
    this.editForm = this.fb.group({
      company_name: ['', [Validators.required, Validators.minLength(2)]],
      location: ['', Validators.required],
      work_type: ['retail', Validators.required],
      title: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  // Access to Math library for templates
  Math = Math;

  ngOnInit() {
    // Make sure modals are closed
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.showEditForm = false;

    this.storeId = this.route.snapshot.paramMap.get('id') || '';
    
    if (this.storeId) {
      this.loadStoreDetails();
      this.checkUserPermissions();
    } else {
      this.error = 'Invalid store ID';
      this.loading = false;
    }
  }

  loadStoreDetails() {
    this.loading = true;
    this.error = '';
    
    this.storeService.getStoreById(this.storeId)
      .subscribe({
        next: (data) => {
          this.store = data;
          console.log('Store data loaded:', this.store);
          console.log('Store location:', this.store.location);
          
          this.loadReviews();
          this.loading = false;
          
          // Increment store views
          this.storeService.incrementStoreViews(this.storeId).subscribe();
        },
        error: (error) => {
          console.error('Error loading store details:', error);
          this.error = error.message || 'Failed to load store details';
          this.loading = false;
        }
      });
  }

  loadReviews() {
    this.storeService.getStoreReviews(this.storeId)
      .subscribe({
        next: (reviews: any[]) => {
          this.reviews = reviews;
          this.sortReviews();
        },
        error: (error: any) => {
          console.error('Error loading reviews:', error);
        }
      });
  }

  checkUserPermissions() {
    this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = !!user;
      
      if (user && user.token) {
        // Add debug logging
        console.log('Current user:', user);
        const payload = this.authService.decodeToken(user.token);
        console.log('Token payload:', payload);
        
        // Check admin status first using the auth service's hasRole method
        this.isAdmin = this.authService.hasRole('admin');
        
        const userId = payload?.sub || payload?.userId || null; // Make sure we get the correct user ID
        
        console.log('Current user role:', payload?.role);
        console.log('Is admin:', this.isAdmin);
        
        // If store data is available, check ownership
        if (this.store) {
          this.isOwner = this.isAdmin || (userId && userId === this.store.owner);
          console.log('Is owner:', this.isOwner, 'userId:', userId, 'store.owner:', this.store.owner);
        } else {
          // If store data isn't loaded yet, get it
          this.storeService.getStoreById(this.storeId).subscribe(store => {
            this.isOwner = this.isAdmin || (userId && userId === store.owner);
            console.log('Is owner (from API):', this.isOwner, 'userId:', userId, 'store.owner:', store.owner);
          });
        }
      } else {
        this.isAdmin = false;
        this.isOwner = false;
        console.log('User not logged in or no token available');
      }
    });
  }

  sortReviews() {
    if (!Array.isArray(this.reviews)) return;
    switch (this.sortOption) {
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

  onReviewAdded(review: any) {
    this.reviews.unshift(review);
    this.sortReviews();
    
    // Update store average rating
    if (this.store) {
      const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
      this.store.average_rating = totalRating / this.reviews.length;
      this.store.review_count = this.reviews.length;
    }
  }

  onReviewUpdated(event: {updated: boolean, review?: any}) {
    if (event.updated) {
      this.sortReviews();
      
      // Update store average rating
      if (this.store) {
        const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
        this.store.average_rating = totalRating / this.reviews.length;
      }
    }
  }

  // Image gallery methods
  getMainImage() {
    // Check if we have specific images for this store
    if (this.store && this.store.company_name && this.storeImagesByName[this.store.company_name]) {
      const storeSpecificImages = this.storeImagesByName[this.store.company_name];
      return storeSpecificImages[this.currentImageIndex % storeSpecificImages.length];
    }
    return this.storeImages[this.currentImageIndex % this.storeImages.length];
  }

  setMainImage(index: number) {
    this.currentImageIndex = index;
  }

  // Method to get all images for current store (generic or specific)
  getStoreGalleryImages() {
    if (this.store && this.store.company_name && this.storeImagesByName[this.store.company_name]) {
      return this.storeImagesByName[this.store.company_name];
    }
    return this.storeImages;
  }

  // Image error handling
  handleImageError(event: any) {
    // Set a fallback image if the main image fails to load
    event.target.src = 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80';
  }

  handleThumbnailError(event: any, index: number) {
    // Set a fallback image for thumbnails
    event.target.src = 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80';
  }

  // Mock email generation for the store
  getEmailAddress() {
    const companyNameNoSpaces = this.store.company_name.toLowerCase().replace(/\s+/g, '');
    return `info&#64;${companyNameNoSpaces}.com`;
  }

  // Admin Methods
  updateStore() {
    this.showEditModal = true;
    this.formError = '';
    
    // Populate form with store data
    this.editForm.patchValue({
      company_name: this.store.company_name,
      location: this.store.location,
      work_type: this.store.work_type || 'retail',
      title: this.store.title || '',
      description: this.store.description || ''
    });
  }

  // Toggle method for inline edit form
  toggleEditForm() {
    this.showEditForm = !this.showEditForm;
    this.formError = '';
    
    if (this.showEditForm) {
      // Populate form with store data
      this.editForm.patchValue({
        company_name: this.store.company_name,
        location: this.store.location,
        work_type: this.store.work_type || 'retail',
        title: this.store.title || '',
        description: this.store.description || ''
      });
    } else {
      // Reset form when closing
      this.editForm.reset();
    }
  }

  cancelEdit() {
    this.showEditModal = false;
    this.formError = '';
    this.editForm.reset();
  }

  submitEdit() {
    if (this.editForm.invalid) {
      this.markFormGroupTouched(this.editForm);
      this.formError = 'Please correct the errors in the form before submitting.';
      return;
    }
    
    this.updating = true;
    this.formError = '';
    
    const updatedStore = { 
      ...this.editForm.value,
      _id: this.storeId
    };
    
    this.storeService.updateStore(this.storeId, updatedStore)
      .subscribe({
        next: (response: any) => {
          // Update local store data
          this.store = {
            ...this.store,
            ...updatedStore
          };
          // Close both forms
          this.showEditModal = false;
          this.showEditForm = false;
          this.updating = false;
        },
        error: (error) => {
          console.error('Error updating store:', error);
          this.formError = error.message || 'Failed to update store. Please try again.';
          this.updating = false;
        }
      });
  }
  
  // Helper to mark all form controls as touched
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  deleteStore() {
    console.log('Delete store button clicked');
    this.showDeleteModal = true;
    this.deleteError = '';
    console.log('Delete modal visibility:', this.showDeleteModal);
  }

  cancelDelete() {
    console.log('Cancel delete button clicked');
    this.showDeleteModal = false;
    this.deleteError = '';
  }

  confirmDelete() {
    console.log('Confirm delete button clicked');
    this.deleting = true;
    this.deleteError = '';
    
    console.log('Attempting to delete store with ID:', this.storeId);
    this.storeService.deleteStore(this.storeId)
      .subscribe({
        next: () => {
          console.log('Store deleted successfully');
          this.router.navigate(['/stores']);
        },
        error: (error) => {
          console.error('Error deleting store:', error);
          this.deleteError = error.message || 'Failed to delete store. Please try again.';
          this.deleting = false;
        }
      });
  }
}