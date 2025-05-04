import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-check',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-5">
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h2>Admin Status Check</h2>
        </div>
        <div class="card-body">
          <div class="mb-4">
            <h4>Current Authentication Status:</h4>
            <ul class="list-group mb-3">
              <li class="list-group-item">
                <strong>Logged in:</strong> {{ isLoggedIn ? 'Yes' : 'No' }}
              </li>
              <li class="list-group-item">
                <strong>User ID:</strong> {{ userId || 'Not available' }}
              </li>
              <li class="list-group-item">
                <strong>Username:</strong> {{ username || 'Not available' }}
              </li>
              <li class="list-group-item">
                <strong>Role:</strong> {{ userRole || 'Not available' }}
              </li>
              <li class="list-group-item">
                <strong>Admin Status:</strong> <span [class]="isAdmin ? 'text-success' : 'text-danger'">{{ isAdmin ? 'Yes' : 'No' }}</span>
              </li>
              <li class="list-group-item">
                <strong>Token Expiry:</strong> {{ tokenExpiry || 'Not available' }}
              </li>
            </ul>
            
            <div *ngIf="tokenPayload" class="mb-3">
              <h5>Token Payload:</h5>
              <pre class="bg-light p-3">{{ tokenPayloadString }}</pre>
            </div>
          </div>
          
          <div class="row mb-4">
            <div class="col">
              <button class="btn btn-primary" (click)="refreshTokenAndCheck()">Refresh Token</button>
              <button class="btn btn-secondary ms-2" (click)="checkAgain()">Check Again</button>
              <button *ngIf="userId" class="btn btn-success ms-2" (click)="promoteToAdmin()">Promote to Admin</button>
              <button class="btn btn-warning ms-2" (click)="loginAsAdmin()">Force Login as Admin</button>
              <button class="btn btn-danger ms-2" (click)="logout()">Logout</button>
            </div>
          </div>
          
          <div *ngIf="message" class="alert" [class.alert-success]="!error" [class.alert-danger]="error">
            {{ message }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    pre {
      white-space: pre-wrap;
      word-break: break-all;
    }
  `]
})
export class AdminCheckComponent implements OnInit {
  isLoggedIn: boolean = false;
  isAdmin: boolean = false;
  userId: string | null = null;
  username: string | null = null;
  userRole: string | null = null;
  tokenExpiry: string | null = null;
  tokenPayload: any = null;
  tokenPayloadString: string = '';
  
  message: string = '';
  error: boolean = false;
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}
  
  ngOnInit() {
    this.checkStatus();
  }
  
  checkStatus() {
    // Reset message
    this.message = '';
    this.error = false;
    
    // Check current authentication status
    this.isLoggedIn = this.authService.isLoggedIn();
    
    if (this.isLoggedIn) {
      const user = this.authService.currentUserValue;
      
      if (user && user.token) {
        // Decode token
        this.tokenPayload = this.authService.decodeToken(user.token);
        this.tokenPayloadString = JSON.stringify(this.tokenPayload, null, 2);
        
        this.userId = this.tokenPayload?.sub || null;
        this.username = user.username || this.tokenPayload?.username || null;
        this.userRole = this.tokenPayload?.role || null;
        
        // Format expiry time
        if (this.tokenPayload?.exp) {
          const expiryDate = new Date(this.tokenPayload.exp * 1000);
          this.tokenExpiry = expiryDate.toLocaleString();
        }
        
        // Check admin status
        this.isAdmin = this.authService.hasRole('admin');
      }
    } else {
      this.message = 'You are not currently logged in. Please log in first.';
      this.error = true;
    }
  }
  
  checkAgain() {
    this.checkStatus();
    this.message = 'Status checked again.';
  }
  
  refreshTokenAndCheck() {
    if (!this.isLoggedIn) {
      this.message = 'Cannot refresh token: You are not logged in.';
      this.error = true;
      return;
    }
    
    const user = this.authService.currentUserValue;
    if (!user || !user.refreshToken) {
      this.message = 'No refresh token available.';
      this.error = true;
      return;
    }
    
    this.message = 'Refreshing token...';
    
    // Manual refresh token implementation
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    };
    
    this.http.post(`${environment.apiUrl}/refresh`, {
      refresh_token: user.refreshToken
    }, httpOptions).subscribe({
      next: (response: any) => {
        if (response && response.access_token) {
          // Update stored token
          const updatedUser = {
            ...user,
            token: response.access_token
          };
          
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          this.authService.updateCurrentUser(updatedUser);
          
          this.message = 'Token refreshed successfully.';
          this.checkStatus();
        } else {
          this.message = 'Invalid response from server.';
          this.error = true;
        }
      },
      error: (error) => {
        console.error('Error refreshing token:', error);
        this.message = 'Error refreshing token: ' + (error.error?.msg || error.message || 'Unknown error');
        this.error = true;
      }
    });
  }
  
  promoteToAdmin() {
    if (!this.userId) {
      this.message = 'Cannot promote: User ID not available.';
      this.error = true;
      return;
    }
    
    this.message = 'Promoting user to admin role...';
    this.http.post(`${environment.apiUrl}/admin/promote`, { userId: this.userId }).subscribe({
      next: (response: any) => {
        this.message = 'User promoted to admin role. Please refresh your token.';
        // Don't refresh automatically to show the message
      },
      error: (error) => {
        console.error('Error promoting user:', error);
        this.message = 'Error promoting user: ' + (error.error?.error || error.message || 'Unknown error');
        this.error = true;
      }
    });
  }
  
  loginAsAdmin() {
    // This is a workaround method that directly modifies local storage
    // to set the current user as admin without going through the backend
    try {
      const user = this.authService.currentUserValue;
      if (!user || !user.token) {
        this.message = 'No user logged in';
        this.error = true;
        return;
      }
      
      // Temporarily log in as admin by modifying the local storage directly
      // This will only work until the token expires or the page is refreshed
      const adminUser = { ...user };
      
      // Get payload from current token
      const payload = this.authService.decodeToken(user.token);
      if (!payload) {
        this.message = 'Could not decode token';
        this.error = true;
        return;
      }
      
      // Set admin role in local storage (this won't affect the actual token)
      adminUser.role = 'admin';
      
      // Store user to simulate admin login
      localStorage.setItem('currentUser', JSON.stringify(adminUser));
      this.authService.updateCurrentUser(adminUser);
      
      this.message = 'Temporarily set as admin in local storage. The server still sees you as a regular user. Go to Beach Boutique now to see admin features.';
      this.checkStatus();
    } catch (error) {
      console.error('Error setting admin role:', error);
      this.message = 'Error setting admin role: ' + (error instanceof Error ? error.message : 'Unknown error');
      this.error = true;
    }
  }
  
  logout() {
    this.authService.logout();
    this.message = 'You have been logged out.';
    this.isLoggedIn = false;
    this.isAdmin = false;
    this.userId = null;
    this.username = null;
    this.userRole = null;
    this.tokenExpiry = null;
    this.tokenPayload = null;
    this.tokenPayloadString = '';
  }
} 