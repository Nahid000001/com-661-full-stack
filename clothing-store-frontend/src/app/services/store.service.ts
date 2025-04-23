// src/app/services/store.service.ts
import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, timeout, retry, delay, concatMap, retryWhen, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from './error.service';
import { 
  Store, 
  StoreListResponse, 
  StoreCreateResponse, 
  StoreUpdateResponse, 
  StoreDeleteResponse 
} from '../interfaces/store.interface';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  constructor(
    private http: HttpClient,
    private errorService: ErrorService
  ) { }

  getAllStores(page: number = 1, limit: number = 10): Observable<StoreListResponse> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    
    console.log(`Fetching stores from ${environment.apiUrl}/stores with page=${page} and limit=${limit}`);
    
    return this.http.get<StoreListResponse>(`${environment.apiUrl}/stores?page=${page}&limit=${limit}`, httpOptions)
      .pipe(
        timeout(15000), // 15 second timeout
        catchError((error: HttpErrorResponse) => {
          console.error('Error fetching stores:', error);
          this.errorService.setError('Failed to load stores. Please try again later.');
          
          // Return an empty response instead of throwing error
          return of({
            stores: [],
            total: 0,
            page: page,
            limit: limit,
            total_pages: 0
          } as StoreListResponse);
        })
      );
  }

  getFeaturedStores(limit: number = 4): Observable<StoreListResponse> {
    console.log(`Fetching featured stores with limit=${limit}`);
    
    return this.http.get<StoreListResponse>(`${environment.apiUrl}/stores?page=1&limit=${limit}&sort=rating`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      timeout(10000), // 10 second timeout
      retry(2), // Retry failed requests up to 2 times
      catchError(error => {
        console.error('Error in getFeaturedStores:', error);
        this.errorService.setError('Failed to load featured stores. Please try again later.');
        // Return empty store list on error
        return of({
          stores: [],
          total: 0,
          page: 1,
          limit: limit,
          total_pages: 0
        } as StoreListResponse);
      })
    );
  }

  retryWithBackoff<T>(maxRetries: number = 3, initialDelay: number = 1000): (source: Observable<T>) => Observable<T> {
    return (source: Observable<T>) => {
      return source.pipe(
        concatMap((value, i) => of(value).pipe(
          // On success, just return the value
          catchError((error, caught) => {
            // If we've reached the max number of retries, throw the error
            if (i >= maxRetries) {
              return throwError(() => error);
            }
            
            console.log(`Attempt ${i + 1} failed, retrying in ${initialDelay * Math.pow(2, i)}ms`);
            
            // Retry after a delay, exponentially increasing with each attempt
            return of(value).pipe(
              delay(initialDelay * Math.pow(2, i)),
              concatMap(() => caught)
            );
          })
        ))
      );
    };
  }

  getStoreById(id: string): Observable<Store> {
    console.log(`Fetching store with ID: ${id}`);
    return this.http.get<Store>(`${environment.apiUrl}/stores/${id}`)
      .pipe(
        timeout(10000), // 10 second timeout
        this.retryWithBackoff(3), // Retry with exponential backoff
        catchError((error: HttpErrorResponse) => {
          console.error(`Error fetching store with ID ${id}:`, error);
          let errorMsg = 'Failed to fetch store details';
          
          if (error.status === 0) {
            errorMsg = 'Network error. Please check your connection.';
          } else if (error.status === 404) {
            errorMsg = 'Store not found.';
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          }
          
          this.errorService.setError(errorMsg);
          
          return throwError(() => ({ 
            status: error.status, 
            message: errorMsg
          }));
        })
      );
  }

  createStore(storeData: Partial<Store>): Observable<StoreCreateResponse> {
    console.log('Creating new store:', storeData);
    
    return this.http.post<StoreCreateResponse>(`${environment.apiUrl}/stores`, storeData)
      .pipe(
        timeout(15000),
        catchError((error: HttpErrorResponse) => {
          console.error('Error creating store:', error);
          let errorMsg = 'Failed to create store';
          
          if (error.status === 401) {
            errorMsg = 'You must be logged in to create a store';
          } else if (error.status === 403) {
            errorMsg = 'You do not have permission to create a store';
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          }
          
          this.errorService.setError(errorMsg);
          
          return throwError(() => ({ 
            status: error.status, 
            message: errorMsg
          }));
        })
      );
  }

  updateStore(id: string, storeData: Partial<Store>): Observable<StoreUpdateResponse> {
    console.log(`Updating store ${id}:`, storeData);
    
    return this.http.put<StoreUpdateResponse>(`${environment.apiUrl}/stores/${id}`, storeData)
      .pipe(
        timeout(15000),
        catchError((error: HttpErrorResponse) => {
          console.error(`Error updating store ${id}:`, error);
          let errorMsg = 'Failed to update store';
          
          if (error.status === 401) {
            errorMsg = 'You must be logged in to update a store';
          } else if (error.status === 403) {
            errorMsg = 'You do not have permission to update this store';
          } else if (error.status === 404) {
            errorMsg = 'Store not found';
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          }
          
          this.errorService.setError(errorMsg);
          
          return throwError(() => ({ 
            status: error.status, 
            message: errorMsg
          }));
        })
      );
  }

  deleteStore(id: string): Observable<StoreDeleteResponse> {
    console.log(`Deleting store ${id}`);
    
    return this.http.delete<StoreDeleteResponse>(`${environment.apiUrl}/stores/${id}`)
      .pipe(
        timeout(15000),
        catchError((error: HttpErrorResponse) => {
          console.error(`Error deleting store ${id}:`, error);
          let errorMsg = 'Failed to delete store';
          
          if (error.status === 401) {
            errorMsg = 'You must be logged in to delete a store';
          } else if (error.status === 403) {
            errorMsg = 'You do not have permission to delete this store';
          } else if (error.status === 404) {
            errorMsg = 'Store not found';
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          }
          
          this.errorService.setError(errorMsg);
          
          return throwError(() => ({ 
            status: error.status, 
            message: errorMsg
          }));
        })
      );
  }

  incrementStoreViews(storeId: string): Observable<any> {
    return of(null); // This endpoint doesn't exist yet, will be implemented in future
  }

  getStoreReviews(storeId: string): Observable<any> {
    console.log(`Fetching reviews for store ${storeId}`);
    
    return this.http.get<any>(`${environment.apiUrl}/stores/${storeId}/reviews`)
      .pipe(
        timeout(10000),
        retry(1),
        catchError((error: HttpErrorResponse) => {
          console.error(`Error fetching reviews for store ${storeId}:`, error);
          // Don't show error message for reviews as it's not critical
          return of([]);
        })
      );
  }
}