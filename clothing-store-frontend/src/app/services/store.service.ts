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
        retryWhen(errors => 
          errors.pipe(
            // Log the error
            tap(error => {
              console.error('Error fetching stores, retrying:', error);
            }),
            // Retry 3 times with exponential backoff
            concatMap((error, i) => {
              if (i >= 3) {
                return throwError(() => error);
              }
              const retryDelay = 1000 * Math.pow(2, i);
              console.log(`Retry attempt ${i + 1}, waiting ${retryDelay}ms`);
              return of(error).pipe(delay(retryDelay));
            })
          )
        ),
        catchError((error: HttpErrorResponse) => {
          console.error('Error fetching stores after retries:', error);
          let errorMsg = 'Failed to fetch stores';
          
          if (error.status === 0) {
            errorMsg = 'Could not connect to the server. Please check your internet connection and ensure the server is running.';
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

  getFeaturedStores(limit: number = 4): Observable<StoreListResponse> {
    console.log(`Fetching featured stores with limit=${limit}`);
    return this.http.get<StoreListResponse>(`${environment.apiUrl}/stores?page=1&limit=${limit}`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      timeout(10000), // 10 second timeout
      retry(3), // Retry up to 3 times
      tap(response => console.log('Featured stores response:', response)),
      catchError(error => {
        console.error('Error in getFeaturedStores:', error);
        // Return empty store list instead of throwing error
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
            errorMsg = 'Could not connect to the server. Please check your internet connection and ensure the server is running.';
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
    return this.http.post<StoreCreateResponse>(`${environment.apiUrl}/stores`, storeData)
      .pipe(
        timeout(10000), // 10 second timeout
        retry(2), // Retry up to 2 times on failure
        catchError((error: HttpErrorResponse) => {
          console.error('Error creating store:', error);
          let errorMsg = 'Failed to create store';
          
          if (error.status === 0) {
            errorMsg = 'Could not connect to the server. Please check your internet connection and ensure the server is running.';
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
    return this.http.put<StoreUpdateResponse>(`${environment.apiUrl}/stores/${id}`, storeData)
      .pipe(
        timeout(10000), // 10 second timeout
        retry(2), // Retry up to 2 times on failure
        catchError((error: HttpErrorResponse) => {
          console.error(`Error updating store with ID ${id}:`, error);
          let errorMsg = 'Failed to update store';
          
          if (error.status === 0) {
            errorMsg = 'Could not connect to the server. Please check your internet connection and ensure the server is running.';
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
    return this.http.delete<StoreDeleteResponse>(`${environment.apiUrl}/stores/${id}`)
      .pipe(
        timeout(10000), // 10 second timeout
        retry(2), // Retry up to 2 times on failure
        catchError((error: HttpErrorResponse) => {
          console.error(`Error deleting store with ID ${id}:`, error);
          let errorMsg = 'Failed to delete store';
          
          if (error.status === 0) {
            errorMsg = 'Could not connect to the server. Please check your internet connection and ensure the server is running.';
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
    return this.http.post<any>(`${environment.apiUrl}/stores/${storeId}/increment-views`, {});
  }

  getStoreReviews(storeId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/stores/${storeId}/reviews`)
      .pipe(
        timeout(10000),
        retry(2),
        catchError((error: HttpErrorResponse) => {
          console.error(`Error fetching reviews for store ${storeId}:`, error);
          let errorMsg = 'Failed to fetch store reviews';
          
          if (error.status === 0) {
            errorMsg = 'Could not connect to the server. Please check your internet connection.';
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
}