import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  profileForm: FormGroup;
  loading = false;
  error = '';
  updateSuccess = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
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
  }

  getUserInitial(): string {
    return this.user?.username?.charAt(0).toUpperCase() || 'U';
  }

  loadUserProfile(): void {
    this.loading = true;
    this.userService.getCurrentUser().subscribe({
      next: (userData) => {
        this.user = userData;
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
} 