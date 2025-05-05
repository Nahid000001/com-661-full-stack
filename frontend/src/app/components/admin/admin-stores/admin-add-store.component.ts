import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../../services/store.service';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { Store } from '../../../interfaces/store.interface';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-admin-add-store',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './admin-add-store.component.html',
  styleUrls: ['./admin-add-store.component.scss']
})
export class AdminAddStoreComponent implements OnInit {
  storeForm: FormGroup;
  loading = false;
  uploading = false;
  error = '';
  success = '';
  isAdmin = false;
  userSearchResults: any[] = [];
  searchLoading = false;
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  
  constructor(
    private fb: FormBuilder,
    private storeService: StoreService,
    private authService: AuthService,
    private userService: UserService,
    public router: Router
  ) {
    this.storeForm = this.fb.group({
      company_name: ['', [Validators.required, Validators.minLength(2)]],
      title: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      location: ['', Validators.required],
      work_type: ['retail', Validators.required],
      store_category: ['', Validators.required],
      contact_email: ['', [Validators.email]],
      contact_phone: ['', [Validators.pattern('^[0-9+-]{10,15}$')]],
      owner: ['', Validators.required],
      userSearch: [''],
      image: ['']
    });
    
    // Set up the user search functionality
    this.storeForm.get('userSearch')?.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(query => {
          if (!query || query.length < 2) {
            return of([]);
          }
          this.searchLoading = true;
          return this.storeService.searchUsers(query)
            .pipe(
              catchError(() => of([])),
              finalize(() => {
                this.searchLoading = false;
              })
            );
        })
      )
      .subscribe(results => {
        this.userSearchResults = results;
      });
  }

  ngOnInit(): void {
    // Check if user is admin
    this.isAdmin = this.authService.hasRole('admin');
    
    if (!this.isAdmin) {
      this.error = 'You need admin privileges to access this page.';
      setTimeout(() => {
        this.router.navigate(['/admin']);
      }, 1500);
    }
  }
  
  selectUser(user: any) {
    this.storeForm.patchValue({
      owner: user.username,
      userSearch: `${user.username} ${user.first_name ? `(${user.first_name} ${user.last_name})` : ''}`
    });
    this.userSearchResults = [];
  }
  
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImage = input.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(this.selectedImage);
    }
  }
  
  uploadImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.selectedImage) {
        resolve('');
        return;
      }
      
      this.uploading = true;
      this.storeService.uploadStoreImage(this.selectedImage)
        .pipe(
          finalize(() => {
            this.uploading = false;
          })
        )
        .subscribe({
          next: (response) => {
            resolve(response.file_url);
          },
          error: (error) => {
            reject(error);
          }
        });
    });
  }

  async onSubmit() {
    if (this.storeForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.storeForm.controls).forEach(key => {
        this.storeForm.get(key)?.markAsTouched();
      });
      this.error = 'Please fill all required fields correctly.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    try {
      // First, upload the image if selected
      let imageUrl = '';
      if (this.selectedImage) {
        try {
          imageUrl = await this.uploadImage();
        } catch (err) {
          this.error = 'Failed to upload store image. Please try again.';
          this.loading = false;
          return;
        }
      }
      
      // Prepare store data
      const storeData = { ...this.storeForm.value };
      delete storeData.userSearch; // Remove the search field
      
      if (imageUrl) {
        storeData.image = imageUrl;
      }
      
      // Create the store
      this.storeService.adminCreateStore(storeData)
        .pipe(
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe({
          next: (response) => {
            this.success = `Store "${storeData.company_name}" created successfully and assigned to ${storeData.owner}!`;
            setTimeout(() => {
              this.router.navigate(['/admin/stores']);
            }, 1500);
          },
          error: (err) => {
            this.error = err.message || 'Failed to create store. Please try again.';
          }
        });
    } catch (err: any) {
      this.error = err.message || 'An unexpected error occurred.';
      this.loading = false;
    }
  }
  
  clearSearch() {
    this.storeForm.patchValue({
      userSearch: ''
    });
    this.userSearchResults = [];
  }
} 