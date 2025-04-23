import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Define server status type
export type ServerStatus = 'online' | 'offline' | 'checking';

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private serverStatusSubject = new BehaviorSubject<ServerStatus>('checking');
  public serverStatus$ = this.serverStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initial health check when service is initialized
    this.checkServerHealth().subscribe();
  }

  /**
   * Check the backend server health status
   * @returns Observable that resolves when check completes
   */
  checkServerHealth(): Observable<any> {
    this.serverStatusSubject.next('checking');
    
    return this.http.get<any>(`${environment.apiUrl}/health`).pipe(
      tap(() => {
        this.serverStatusSubject.next('online');
      }),
      catchError(error => {
        console.error('Health check failed:', error);
        this.serverStatusSubject.next('offline');
        return of(error); // Convert error to successful Observable to avoid breaking consumers
      })
    );
  }

  /**
   * Get the current server status
   * @returns The current server status
   */
  getCurrentStatus(): ServerStatus {
    return this.serverStatusSubject.value;
  }
} 