// src/app/services/review.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(private http: HttpClient) { }

  getStoreReviews(storeId: string, page: number = 1, limit: number = 5): Observable<any> {
    return this.http.get(`${environment.apiUrl}/stores/${storeId}/reviews?page=${page}&limit=${limit}`);
  }

  addReview(storeId: string, review: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/stores/${storeId}/reviews/add`, review);
  }

  editReview(storeId: string, reviewId: string, review: any): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}`, review);
  }

  deleteReview(storeId: string, reviewId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}`);
  }

  replyToReview(storeId: string, reviewId: string, reply: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/stores/${storeId}/reviews/${reviewId}/reply`, { reply });
  }
}