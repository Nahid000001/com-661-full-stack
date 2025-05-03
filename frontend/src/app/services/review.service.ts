// src/app/services/review.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Review } from '../models/review.model';
import { catchError, map } from 'rxjs/operators';
import { ErrorService } from './error.service';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(
    private http: HttpClient,
    private errorService: ErrorService
  ) { }

  getStoreReviews(storeId: string, page: number = 1, limit: number = 5): Observable<{ reviews: Review[], total: number }> {
    return this.http.get<{ reviews: Review[], total: number }>(
      `${environment.apiUrl}/stores/${storeId}/reviews?page=${page}&limit=${limit}`
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching reviews:', error);
        this.errorService.setError('Failed to load reviews');
        return throwError(() => error);
      })
    );
  }

  getLatestReviews(limit: number = 3): Observable<Review[]> {
    return this.http.get<{ reviews: Review[] }>(
      `${environment.apiUrl}/reviews/latest?limit=${limit}`
    ).pipe(
      map(response => response.reviews || []),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching latest reviews:', error);
        // Don't show error message for this as it's not critical
        return throwError(() => error);
      })
    );
  }

  addReview(storeId: string, review: Omit<Review, '_id' | 'created_at' | 'updated_at'>): Observable<Review> {
    return this.http.post<Review>(`${environment.apiUrl}/stores/${storeId}/reviews/add`, review)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error adding review:', error);
          this.errorService.setError(error.error?.message || 'Failed to add review');
          return throwError(() => error);
        })
      );
  }

  editReview(storeId: string, reviewId: string, review: Partial<Review>): Observable<Review> {
    return this.http.patch<any>(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}`, review)
      .pipe(
        map(response => response.review || {}),
        catchError((error: HttpErrorResponse) => {
          console.error('Error editing review:', error);
          this.errorService.setError(error.error?.message || 'Failed to edit review');
          return throwError(() => error);
        })
      );
  }

  deleteReview(storeId: string, reviewId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error deleting review:', error);
          this.errorService.setError(error.error?.message || 'Failed to delete review');
          return throwError(() => error);
        })
      );
  }

  replyToReview(storeId: string, reviewId: string, reply: string): Observable<Review> {
    return this.http.post<Review>(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}/reply`, { reply })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error replying to review:', error);
          this.errorService.setError(error.error?.message || 'Failed to reply to review');
          return throwError(() => error);
        })
      );
  }
}