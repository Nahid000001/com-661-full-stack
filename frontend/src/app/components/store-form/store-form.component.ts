import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { Store, StoreCreateResponse, StoreUpdateResponse } from '../../interfaces/store.interface';
import { catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-store-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './store-form.component.html',
  styleUrls: ['./store-form.component.scss']
})
export class StoreFormComponent implements OnInit {
  storeForm: FormGroup;
  storeId: string | null = null;
  isEdit = false;
  loading = false;
  error = '';
  success = '';
  isAdmin = false;
  isStoreOwner = false;
  authState: any = null;

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private authService: AuthService,
    private route: ActivatedRoute,
    public router: Router
  ) {
    this.storeForm = this.fb.group({
      company_name: ['', [Validators.required, Validators.minLength(2)]],
      location: ['', Validators.required],
      work_type: ['retail', Validators.required],
      title: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    console.log('StoreFormComponent initialized');
    
    // Check authentication status
    this.authState = this.authService.getAuthState();
    console.log('Auth state:', this.authState);
    
    if (!this.authState || !this.authState.isLoggedIn) {
      console.error('User not authenticated, redirecting to login');
      this.error = 'You must be logged in to view this page.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
      return;
    }
    
    // Check if user has appropriate permissions
    this.checkUserPermissions();

    // Get store ID from route if it's an edit
    this.storeId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.storeId;
    
    console.log('Store form mode:', this.isEdit ? 'Edit' : 'Add', 'StoreID:', this.storeId);
    
    // Check if we're coming from the admin route
    const isAdminRoute = this.router.url.includes('/admin/');
    console.log('Is admin route:', isAdminRoute);
    
    if (this.isEdit && this.storeId) {
      this.loading = true;
      this.storeService.getStoreById(this.storeId)
        .pipe(
          catchError(err => {
            console.error('Error in store fetch:', err);
            this.error = `Failed to load store: ${err.message || 'Unknown error'}`;
            return of(null);
          }),
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe(store => {
          if (store) {
            console.log('Successfully loaded store data for editing:', store);
            // Populate the form with store data
            this.storeForm.patchValue({
              company_name: store.company_name,
              location: store.location,
              work_type: store.work_type || 'retail',
              title: store.title,
              description: store.description
            });
          }
        });
    }
  }

  checkUserPermissions() {
    // Check if user is admin or store owner
    this.isAdmin = this.authService.hasRole('admin');
    this.isStoreOwner = this.authService.hasRole('store_owner');
    
    console.log('User permissions:', {
      isAdmin: this.isAdmin,
      isStoreOwner: this.isStoreOwner
    });
    
    if (!this.isAdmin && !this.isStoreOwner) {
      console.warn('User does not have permission to access store form');
      this.error = 'You do not have permission to access this page. You must be an admin or store owner.';
      // User doesn't have permission, redirect to home
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 1500);
    }
  }

  onSubmit() {
    if (this.storeForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.storeForm.controls).forEach(key => {
        const control = this.storeForm.get(key);
        control?.markAsTouched();
      });
      console.warn('Form submission attempted with invalid data');
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const storeData = this.storeForm.value;
    console.log('Submitting store data:', storeData);
    
    // Check if we're coming from the admin route
    const isAdminRoute = this.router.url.includes('/admin/');
    
    if (this.isEdit && this.storeId) {
      // Update existing store
      this.storeService.updateStore(this.storeId, storeData)
        .pipe(
          catchError(err => {
            console.error('Error in store update:', err);
            this.error = `Failed to update store: ${err.message || 'Unknown error'}`;
            return of(null);
          }),
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe(response => {
          if (response) {
            console.log('Store updated successfully:', response);
            this.success = 'Store updated successfully!';
            
            // Redirect after short delay to show success message
            setTimeout(() => {
              if (isAdminRoute) {
                this.router.navigate(['/admin/stores']);
              } else {
                if (response.store && response.store._id) {
                  this.router.navigate(['/stores', response.store._id]);
                } else if (this.storeId) {
                  this.router.navigate(['/stores', this.storeId]);
                } else {
                  this.router.navigate(['/stores']);
                }
              }
            }, 1500);
          }
        });
    } else {
      // Create new store
      this.storeService.createStore(storeData)
        .pipe(
          catchError(err => {
            console.error('Error in store creation:', err);
            this.error = `Failed to create store: ${err.message || 'Unknown error'}`;
            return of(null);
          }),
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe(response => {
          if (response) {
            console.log('Store created successfully:', response);
            this.success = 'Store created successfully!';
            
            // Redirect after short delay to show success message
            setTimeout(() => {
              if (isAdminRoute) {
                this.router.navigate(['/admin/stores']);
              } else {
                if (response.store && response.store._id) {
                  this.router.navigate(['/stores', response.store._id]);
                } else if (response.store_id) {
                  this.router.navigate(['/stores', response.store_id]);
                } else {
                  this.router.navigate(['/stores']);
                }
              }
            }, 1500);
          }
        });
    }
  }
} 