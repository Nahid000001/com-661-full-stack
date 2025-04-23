import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <h2>Processing your login...</h2>
      <div class="spinner"></div>
      <p *ngIf="error" class="error">{{ error }}</p>
    </div>
  `,
  styles: [`
    .callback-container {
      max-width: 400px;
      margin: 4rem auto;
      padding: 2rem;
      text-align: center;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    h2 {
      color: #3f51b5;
      margin-bottom: 1.5rem;
    }
    .spinner {
      display: inline-block;
      width: 50px;
      height: 50px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #3f51b5;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 1.5rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error {
      color: #f44336;
      margin-top: 1rem;
    }
  `]
})
export class OAuthCallbackComponent implements OnInit {
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get query parameters
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const error = params['error'];
      const provider = this.route.snapshot.paramMap.get('provider') || 'google';

      if (error) {
        this.error = `Authentication error: ${error}`;
        setTimeout(() => this.router.navigate(['/login']), 3000);
        return;
      }

      if (!code) {
        this.error = 'No authorization code received';
        setTimeout(() => this.router.navigate(['/login']), 3000);
        return;
      }

      // Process the OAuth callback
      this.authService.handleOAuthCallback(provider, code, state)
        .subscribe({
          next: () => {
            this.router.navigate(['/']);
          },
          error: (error) => {
            this.error = error.error?.message || 'Failed to complete authentication';
            setTimeout(() => this.router.navigate(['/login']), 3000);
          }
        });
    });
  }
} 