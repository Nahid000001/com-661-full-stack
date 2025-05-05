// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';
import { AuthService } from './auth.service';

interface UserResponse {
  users: any[];
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Get current user profile
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/profile`)
      .pipe(
        timeout(10000),
        retry(2),
        catchError(this.handleError)
      );
  }

  // Get user by ID
  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/${userId}`)
      .pipe(
        timeout(10000),
        retry(2),
        catchError(this.handleError)
      );
  }

  // Update user profile
  updateProfile(userData: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/users/profile`, userData)
      .pipe(
        timeout(10000),
        retry(2),
        catchError(this.handleError)
      );
  }

  // Admin operations
  getAllUsers(): Observable<UserResponse> {
    console.log('Fetching all users from API...');
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    };
    
    return this.http.get<UserResponse>(`${environment.apiUrl}/users/admin/all`, httpOptions)
      .pipe(
        tap(response => console.log('Users loaded successfully:', response)),
        timeout(15000),
        retry(1),
        catchError((error: HttpErrorResponse) => {
          console.error('Error in getAllUsers():', error);
          
          if (error.status === 0) {
            console.error('Network error - Could not reach backend API');
          } else if (error.status === 401) {
            console.error('Authentication error - Token may be invalid or expired');
            // Check if token is expired
            if (this.authService.isTokenExpired(this.authService.getAuthorizationToken())) {
              console.error('Token is expired - User should log in again');
            }
          } else if (error.status === 403) {
            console.error('Authorization error - User lacks admin permissions');
          }
          
          return throwError(() => error);
        })
      );
  }

  getUser(userId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/users/${userId}`)
      .pipe(
        timeout(10000),
        retry(2),
        catchError(this.handleError)
      );
  }

  updateUser(userId: string, userData: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/users/${userId}`, userData)
      .pipe(
        timeout(10000),
        retry(2),
        catchError(this.handleError)
      );
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/users/${userId}`)
      .pipe(
        timeout(10000),
        retry(2),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      console.error('Client error:', error.error.message);
    } else {
      // Server-side error
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${JSON.stringify(error.error)}`);
    }
    // Return an observable with a user-facing error message
    return throwError(() => error);
  }
} 