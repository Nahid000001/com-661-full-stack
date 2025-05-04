// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
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

  // Error handling
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}`;
    }
    
    console.error('User service error:', error);
    return throwError(() => ({ status: error.status, message: errorMessage }));
  }

  // Admin operations
  getAllUsers(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${environment.apiUrl}/users/admin/all`)
      .pipe(
        timeout(10000),
        retry(2),
        catchError(this.handleError)
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
} 