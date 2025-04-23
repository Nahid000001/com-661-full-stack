import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <h2>Authentication in progress...</h2>
      <div class="loader"></div>
      <p *ngIf="error">{{ error }}</p>
    </div>
  `,
  styles: [`
    .callback-container {
      max-width: 400px;
      margin: 100px auto;
      text-align: center;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
    }
    .loader {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3f51b5;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    const refreshToken = this.route.snapshot.queryParamMap.get('refresh_token');
    const username = this.route.snapshot.queryParamMap.get('username');
    
    if (token && refreshToken && username) {
      // Store user details directly
      const user = { 
        username: username, 
        token: token, 
        refreshToken: refreshToken 
      };
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.authService.updateCurrentUser(user);
      
      // Redirect to home
      this.router.navigate(['/']);
    } else {
      // Handle error
      this.error = 'Authentication failed. Missing token or user information.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    }
  }
} 