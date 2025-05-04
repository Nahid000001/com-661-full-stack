import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { Store, StoreCreateResponse, StoreUpdateResponse } from '../../interfaces/store.interface';

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

  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
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
    // Check if user has appropriate permissions
    this.checkUserPermissions();

    // Get store ID from route if it's an edit
    this.storeId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.storeId;
    
    if (this.isEdit && this.storeId) {
      this.loading = true;
      this.storeService.getStoreById(this.storeId).subscribe({
        next: (store: Store) => {
          // Populate the form with store data
          this.storeForm.patchValue({
            company_name: store.company_name,
            location: store.location,
            work_type: store.work_type || 'retail',
            title: store.title,
            description: store.description
          });
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load store details.';
          this.loading = false;
        }
      });
    }
  }

  checkUserPermissions() {
    // Check if user is admin or store owner
    this.isAdmin = this.authService.hasRole('admin');
    this.isStoreOwner = this.authService.hasRole('store_owner');
    
    if (!this.isAdmin && !this.isStoreOwner) {
      // User doesn't have permission, redirect to home
      this.router.navigate(['/']);
    }
  }

  onSubmit() {
    if (this.storeForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.storeForm.controls).forEach(key => {
        const control = this.storeForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const storeData = this.storeForm.value;
    
    if (this.isEdit && this.storeId) {
      // Update existing store
      this.storeService.updateStore(this.storeId, storeData).subscribe({
        next: (response: StoreUpdateResponse) => {
          this.success = 'Store updated successfully!';
          this.loading = false;
          // Redirect after short delay to show success message
          setTimeout(() => {
            this.router.navigate(['/stores', this.storeId]);
          }, 1500);
        },
        error: (err) => {
          this.error = 'Failed to update store. Please try again.';
          this.loading = false;
        }
      });
    } else {
      // Create new store
      this.storeService.createStore(storeData).subscribe({
        next: (response: StoreCreateResponse) => {
          this.success = 'Store created successfully!';
          this.loading = false;
          // Redirect after short delay to show success message
          setTimeout(() => {
            this.router.navigate(['/stores', response.store._id]);
          }, 1500);
        },
        error: (err) => {
          this.error = 'Failed to create store. Please try again.';
          this.loading = false;
        }
      });
    }
  }
} 