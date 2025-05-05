import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { catchError, of, timeout } from 'rxjs';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: any[] = [];
  loading = true;
  error = '';
  apiStatus: { connected: boolean, authenticated: boolean } | null = null;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';
    
    // Check if user is logged in as admin
    const authState = this.authService.getAuthState();
    if (!authState.isLoggedIn) {
      this.error = 'You must be logged in to view this page';
      this.loading = false;
      return;
    }
    
    if (authState.role !== 'admin') {
      this.error = 'You do not have permission to view this page';
      this.loading = false;
      return;
    }

    this.userService.getAllUsers().subscribe({
      next: (response) => {
        this.users = response.users;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error loading users:', err);
        
        if (err.status === 0) {
          this.error = 'Could not connect to server. Please check your internet connection.';
        } else if (err.status === 401) {
          this.error = 'Authentication failed. Please log in again.';
          // Optionally redirect to login
        } else if (err.status === 403) {
          this.error = 'You do not have permission to view users.';
        } else if (err.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Failed to load users. Please try again.';
        }
        
        this.loading = false;
        this.checkApiStatus(); // Auto-check API status when there's an error
      }
    });
  }

  checkApiStatus(): void {
    // Check if the API is up
    this.http.get(`${environment.apiUrl}/health`)
      .pipe(
        timeout(3000),
        catchError(err => {
          console.error('Health check failed:', err);
          this.apiStatus = { connected: false, authenticated: false };
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          // Now check authentication
          this.apiStatus = { connected: true, authenticated: false };
          
          // Try getting the authenticated user profile
          this.http.get(`${environment.apiUrl}/users/profile`)
            .pipe(
              timeout(3000),
              catchError(err => {
                console.error('Auth check failed:', err);
                return of(null);
              })
            )
            .subscribe(profileResp => {
              if (profileResp && this.apiStatus) {
                this.apiStatus.authenticated = true;
              }
            });
        }
      });
  }

  updateUserRole(userId: string, role: string): void {
    if (confirm(`Are you sure you want to change this user's role to ${role}?`)) {
      this.userService.updateUser(userId, { role }).subscribe({
        next: (response) => {
          // Update the user in the local array
          this.users = this.users.map(user => {
            if (user._id === userId) {
              return { ...user, role };
            }
            return user;
          });
        },
        error: (err) => {
          console.error('Error updating user role:', err);
          alert('Failed to update user role. Please try again.');
        }
      });
    }
  }

  deleteUser(userId: string): void {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      this.userService.deleteUser(userId).subscribe({
        next: () => {
          this.users = this.users.filter(user => user._id !== userId);
        },
        error: (err) => {
          console.error('Error deleting user:', err);
          alert('Failed to delete user. Please try again.');
        }
      });
    }
  }
} 