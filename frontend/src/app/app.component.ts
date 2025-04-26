// src/app/app.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { LoadingService } from './services/loading.service';
import { HealthService, ServerStatus } from './services/health.service';
import { ErrorService } from './services/error.service';
import { NavigationComponent } from './components/navigation/navigation.component';
import { AlertComponent } from './components/alert/alert.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { HealthCheckComponent } from './components/health-check/health-check.component';
import { Subscription, interval } from 'rxjs';
import { takeWhile, tap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavigationComponent,
    AlertComponent,
    LoadingSpinnerComponent,
    HealthCheckComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Clothing Store Reviews';
  isLoading = false;
  isAdminRoute = false;
  serverStatus: ServerStatus = 'checking';
  currentYear = new Date().getFullYear();
  private loadingSubscription!: Subscription;
  private routerSubscription!: Subscription;
  private serverStatusSubscription!: Subscription;
  private healthCheckSubscription!: Subscription;
  private alive = true;
  public healthService = inject(HealthService);

  constructor(
    private loadingService: LoadingService,
    private router: Router,
    private errorService: ErrorService
  ) {}

  ngOnInit() {
    // Subscribe to loading status
    this.loadingSubscription = this.loadingService.loading$.subscribe(
      loading => this.isLoading = loading
    );
    
    // Subscribe to server status
    this.serverStatusSubscription = this.healthService.serverStatus$.subscribe(
      status => {
        this.serverStatus = status;
        if (status === 'offline') {
          // Only show global error for offline status if we're not already showing one
          if (!this.errorService.hasActiveError()) {
            this.errorService.setError('Server connection lost. Some features may not work correctly.', false);
          }
        }
      }
    );
    
    // Check server health every 30 seconds
    this.healthCheckSubscription = interval(30000)
      .pipe(
        takeWhile(() => this.alive),
        tap(() => {
          // Only check if we're not already checking
          if (this.serverStatus !== 'checking') {
            this.healthService.checkServerHealth().subscribe();
          }
        })
      )
      .subscribe();
    
    // Monitor route changes
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Check if we're on an admin route
        this.isAdminRoute = event.url.includes('/admin');
        
        // Check server health on each main navigation
        this.healthService.checkServerHealth().subscribe();
      }
    });
  }

  // Method to retry server connection
  retryConnection(): void {
    this.errorService.clearError();
    this.serverStatus = 'checking';
    
    // Subscribe to the health check and handle the response
    this.healthService.checkServerHealth().subscribe({
      next: () => {
        // If successful, clear any error messages
        this.errorService.clearError();
      },
      error: (err) => {
        console.error('Retry connection failed:', err);
        // Error will be handled by the service already
      }
    });
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.alive = false;
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.serverStatusSubscription) {
      this.serverStatusSubscription.unsubscribe();
    }
    if (this.healthCheckSubscription) {
      this.healthCheckSubscription.unsubscribe();
    }
  }
}