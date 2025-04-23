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
        timeout(3000), // 3 second timeout instead of 15
        catchError((error: HttpErrorResponse) => {
          console.error('Error fetching stores:', error);
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
    
    // Create fallback store data
    const fallbackStores = [
      {
        _id: 'dummy1',
        company_name: 'Fashion Elite',
        title: 'Premium Fashion Outlet',
        description: 'Designer clothing and accessories for fashion enthusiasts. We offer the latest trends in high-end fashion.',
        location: 'New York',
        work_type: 'retail',
        is_remote: false,
        owner: 'admin',
        average_rating: 4.7,
        review_count: 42,
        views: 250,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        _id: 'dummy2',
        company_name: 'Urban Threads',
        title: 'Contemporary Urban Wear',
        description: 'Streetwear and casual fashion for the modern lifestyle. Featuring urban designs and comfortable everyday wear.',
        location: 'Los Angeles',
        work_type: 'retail',
        is_remote: false,
        owner: 'admin',
        average_rating: 4.3,
        review_count: 28,
        views: 185,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        _id: 'dummy3',
        company_name: 'Eco Apparel',
        title: 'Sustainable Fashion',
        description: 'Eco-friendly clothing made from sustainable materials. Making a positive impact on the planet with ethical fashion.',
        location: 'Portland',
        work_type: 'manufacturing',
        is_remote: false,
        owner: 'admin',
        average_rating: 4.9,
        review_count: 17,
        views: 120,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        _id: 'dummy4',
        company_name: 'Vintage Revival',
        title: 'Classic Fashion Reimagined',
        description: 'Vintage-inspired clothing with a modern twist. Rediscover timeless fashion trends updated for today.',
        location: 'Chicago',
        work_type: 'retail',
        is_remote: false,
        owner: 'admin',
        average_rating: 4.5,
        review_count: 35,
        views: 210,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    // Return dummy data directly instead of making API call
    return of({
      stores: fallbackStores,
      total: fallbackStores.length,
      page: 1,
      limit: limit,
      total_pages: 1
    });
    
    /* Commented out actual API call for now
    return this.http.get<StoreListResponse>(`${environment.apiUrl}/stores?page=1&limit=${limit}&sort=rating`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      timeout(3000), // 3 second timeout
      catchError(error => {
        console.error('Error in getFeaturedStores:', error);
        // Return fallback store data instead of empty array
        return of({
          stores: fallbackStores,
          total: fallbackStores.length,
          page: 1,
          limit: limit,
          total_pages: 1
        } as StoreListResponse);
      })
    );
    */
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
            // Skip showing connection error
            return throwError(() => ({ 
              status: error.status, 
              message: ''
            }));
          } else if (error.error?.message) {
            errorMsg = error.error.message;
            this.errorService.setError(errorMsg);
          }
          
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
            // Skip showing connection error
            return throwError(() => ({ 
              status: error.status, 
              message: ''
            }));
          } else if (error.error?.message) {
            errorMsg = error.error.message;
            this.errorService.setError(errorMsg);
          }
          
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
            // Skip showing connection error
            return throwError(() => ({ 
              status: error.status, 
              message: ''
            }));
          } else if (error.error?.message) {
            errorMsg = error.error.message;
            this.errorService.setError(errorMsg);
          }
          
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
            // Skip showing connection error
            return throwError(() => ({ 
              status: error.status, 
              message: ''
            }));
          } else if (error.error?.message) {
            errorMsg = error.error.message;
            this.errorService.setError(errorMsg);
          }
          
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
            // Skip showing connection error
            return throwError(() => ({ 
              status: error.status, 
              message: ''
            }));
          } else if (error.error?.message) {
            errorMsg = error.error.message;
            this.errorService.setError(errorMsg);
          }
          
          return throwError(() => ({ 
            status: error.status, 
            message: errorMsg
          }));
        })
      );
  }
}