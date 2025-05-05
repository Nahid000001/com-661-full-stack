// src/app/services/review.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Review } from '../models/review.model';
import { catchError, map, shareReplay, tap, timeout } from 'rxjs/operators';
import { ErrorService } from './error.service';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  // Add cache for latest reviews
  private latestReviewsCache: { [key: string]: { data: Review[], timestamp: number } } = {};
  // Cache timeout in ms (5 minutes)
  private cacheDuration = 5 * 60 * 1000;
  
  constructor(
    private http: HttpClient,
    private errorService: ErrorService
  ) { }

  getStoreReviews(storeId: string, page: number = 1, limit: number = 5): Observable<{ reviews: Review[], total: number, totalPages?: number, pageSize?: number }> {
    return this.http.get<{ reviews: Review[], total: number, totalPages?: number, pageSize?: number }>(
      `${environment.apiUrl}/stores/${storeId}/reviews?page=${page}&limit=${limit}`
    ).pipe(
      timeout(10000), // Add timeout
      map(response => ({
        ...response,
        pageSize: limit,
        totalPages: response.totalPages || Math.ceil(response.total / limit)
      })),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching reviews:', error);
        this.errorService.setError('Failed to load reviews');
        return throwError(() => error);
      })
    );
  }

  getLatestReviews(limit: number = 3): Observable<Review[]> {
    const cacheKey = `latest_${limit}`;
    const now = Date.now();
    
    // Check cache first
    if (this.latestReviewsCache[cacheKey] && 
        (now - this.latestReviewsCache[cacheKey].timestamp) < this.cacheDuration) {
      console.log('Returning latest reviews from cache');
      return of(this.latestReviewsCache[cacheKey].data);
    }
    
    return this.http.get<{ reviews: Review[] }>(
      `${environment.apiUrl}/reviews/latest?limit=${limit}`
    ).pipe(
      timeout(8000), // Add timeout
      map(response => response.reviews || []),
      tap(reviews => {
        // Save to cache
        if (reviews) {
          this.latestReviewsCache[cacheKey] = {
            data: reviews,
            timestamp: now
          };
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching latest reviews:', error);
        // Don't show error message for this as it's not critical
        return of([]);
      }),
      // Share the same observable result to all subscribers
      shareReplay(1)
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

  replyToReview(storeId: string, reviewId: string, reply: string, isAdmin: boolean = false): Observable<Review> {
    return this.http.post<Review>(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}/reply`, { reply, isAdmin })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error replying to review:', error);
          this.errorService.setError(error.error?.message || 'Failed to reply to review');
          return throwError(() => error);
        })
      );
  }

  editReplyToReview(storeId: string, reviewId: string, replyId: string, reply: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}/reply/${replyId}`, { reply })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error editing reply:', error);
          this.errorService.setError(error.error?.message || 'Failed to edit reply');
          return throwError(() => error);
        })
      );
  }

  deleteReplyToReview(storeId: string, reviewId: string, replyId: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}/reply/${replyId}`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error deleting reply:', error);
          this.errorService.setError(error.error?.message || 'Failed to delete reply');
          return throwError(() => error);
        })
      );
  }

  getUserReviewsWithReplies(): Observable<{ reviews: Review[], total: number }> {
    return this.http.get<{ reviews: Review[], total: number }>(`${environment.apiUrl}/users/reviews/with-replies`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error getting user reviews with replies:', error);
          this.errorService.setError(error.error?.message || 'Failed to get reviews with replies');
          return throwError(() => error);
        })
      );
  }

  getReviewById(reviewId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/reviews/${reviewId}`)
      .pipe(
        catchError(this.handleError)
      );
  }
  
  updateReview(reviewId: string, reviewData: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/reviews/${reviewId}`, reviewData)
      .pipe(
        catchError(this.handleError)
      );
  }
  
  respondToReview(reviewId: string, response: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/reviews/${reviewId}/response`, { response })
      .pipe(
        catchError(this.handleError)
      );
  }
  
  getUserReviews(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/reviews/user`)
      .pipe(
        catchError(this.handleError)
      );
  }
  
  getReviewResponses(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/reviews/responses`)
      .pipe(
        catchError(this.handleError)
      );
  }
  
  // Admin methods
  getAllReviews(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/reviews/admin/all`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error getting all reviews:', error);
          this.errorService.setError(error.error?.message || 'Failed to get all reviews');
          return throwError(() => error);
        })
      );
  }
  
  private handleError(error: any) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }

  clearCache(): void {
    this.latestReviewsCache = {};
  }
}