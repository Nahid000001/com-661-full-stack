import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { HealthService, ServerStatus } from '../../services/health.service';
import { catchError, finalize, of, tap } from 'rxjs';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-health-check',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './health-check.component.html',
  styleUrls: ['./health-check.component.scss']
})
export class HealthCheckComponent implements OnInit {
  status: 'loading' | 'connected' | 'error' = 'loading';
  apiUrl = environment.apiUrl;
  environment = environment;
  backendVersion: string = 'unknown';
  latency: number = 0;
  authStatus: any;
  detailedError: string = '';
  lastCheckedTime: Date = new Date();
  corsIssue: boolean = false;
  networkIssue: boolean = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private healthService: HealthService
  ) { }

  ngOnInit(): void {
    this.checkApiHealth();
    this.authStatus = this.authService.getAuthState();
  }

  checkApiHealth(): void {
    this.status = 'loading';
    this.detailedError = '';
    this.corsIssue = false;
    this.networkIssue = false;
    
    const startTime = new Date().getTime();
    
    this.http.get<any>(`${this.apiUrl}/health`)
      .pipe(
        tap(() => {
          this.latency = new Date().getTime() - startTime;
        }),
        catchError((error: HttpErrorResponse) => {
          this.latency = new Date().getTime() - startTime;
          this.status = 'error';
          this.lastCheckedTime = new Date();
          
          if (error.status === 0) {
            this.networkIssue = true;
            this.detailedError = 'Network error: Could not connect to the backend. This could be due to CORS issues, the backend service being down, or network connectivity problems.';
          } else if (error.status === 404) {
            this.detailedError = 'Health endpoint not found (404). The backend API might not have a health check endpoint implemented.';
          } else {
            this.detailedError = `HTTP ${error.status}: ${error.message}`;
          }
          
          return of(null);
        }),
        finalize(() => {
          this.lastCheckedTime = new Date();
        })
      )
      .subscribe(response => {
        if (response) {
          this.status = 'connected';
          if (response && typeof response === 'object') {
            if ('version' in response) {
              this.backendVersion = response.version;
            } else if ('details' in response && typeof response.details === 'object') {
              this.backendVersion = `API: ${response.details.api || 'unknown'}, DB: ${response.details.mongo || 'unknown'}`;
            }
          }
        }
      });
  }

  retry(): void {
    this.checkApiHealth();
  }

  checkStoreFunctionality(): void {
    this.http.get(`${this.apiUrl}/stores`)
      .pipe(
        catchError(error => {
          this.detailedError = `Store API error: ${error.status} ${error.message}`;
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.detailedError = 'Store API is working properly';
        }
      });
  }
} 