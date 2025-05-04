import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { RouterModule } from '@angular/router';
import { ViewModeService, ViewMode } from '../../services/view-mode.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  profileForm: FormGroup;
  loading = false;
  error = '';
  updateSuccess = false;
  
  // View mode properties
  viewMode = ViewMode.Admin; // Default to admin view for admins
  viewModes = ViewMode; // Expose enum to template

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private viewModeService: ViewModeService,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
    
    // Subscribe to view mode changes
    this.viewModeService.getViewMode().subscribe(mode => {
      this.viewMode = mode;
    });
  }

  getUserInitial(): string {
    return this.user?.username?.charAt(0).toUpperCase() || 'U';
  }

  loadUserProfile(): void {
    this.loading = true;
    this.userService.getCurrentUser().subscribe({
      next: (userData) => {
        this.user = userData;
        
        // Ensure role is admin for the current user if needed
        if (userData.role !== 'admin' && this.authService.hasRole('admin')) {
          this.updateUserRole('admin');
        }
        
        this.profileForm.patchValue({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || ''
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.error = error.message || 'Failed to load user profile';
        this.loading = false;
      }
    });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.updateSuccess = false;

    const userData = this.profileForm.value;

    this.userService.updateProfile(userData).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.updateSuccess = true;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.error = error.message || 'Failed to update profile';
        this.loading = false;
      }
    });
  }
  
  updateUserRole(role: string): void {
    if (!this.user || !this.user._id) return;
    
    this.loading = true;
    this.error = '';
    
    const userData = { role: role };
    
    this.userService.updateUser(this.user._id, userData).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        // Update the auth service with the new role
        if (this.authService.currentUserValue) {
          const currentUser = this.authService.currentUserValue;
          currentUser.role = role;
          this.authService.updateCurrentUser(currentUser);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating user role:', error);
        this.error = error.message || 'Failed to update role';
        this.loading = false;
      }
    });
  }

  toggleViewMode(mode: ViewMode): void {
    // Set the new view mode in the service
    this.viewModeService.setViewMode(mode);
    
    // No need to manually update viewMode here as we're subscribed to the service
  }

  isAdmin(): boolean {
    return this.user?.role === 'admin' || this.authService.hasRole('admin');
  }
} 