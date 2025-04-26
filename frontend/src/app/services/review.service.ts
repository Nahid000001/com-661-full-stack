// src/app/services/review.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Review } from '../models/review.model';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(private http: HttpClient) { }

  getStoreReviews(storeId: string, page: number = 1, limit: number = 5): Observable<{ reviews: Review[], total: number }> {
    return this.http.get<{ reviews: Review[], total: number }>(`${environment.apiUrl}/stores/${storeId}/reviews?page=${page}&limit=${limit}`);
  }

  addReview(storeId: string, review: Omit<Review, '_id' | 'created_at' | 'updated_at'>): Observable<Review> {
    return this.http.post<Review>(`${environment.apiUrl}/stores/${storeId}/reviews/add`, review);
  }

  editReview(storeId: string, reviewId: string, review: Partial<Review>): Observable<Review> {
    return this.http.patch<Review>(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}`, review);
  }

  deleteReview(storeId: string, reviewId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}`);
  }

  replyToReview(storeId: string, reviewId: string, reply: string): Observable<Review> {
    return this.http.post<Review>(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}/reply`, { reply });
  }
}