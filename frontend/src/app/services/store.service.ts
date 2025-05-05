// src/app/services/store.service.ts
import { Injectable } from '@angular/core';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, timeout, retry, delay, concatMap, retryWhen, tap, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from './error.service';
import { 
  Store, 
  StoreListResponse, 
  StoreCreateResponse, 
  StoreUpdateResponse, 
  StoreDeleteResponse,
  StoreOwnerAssignment,
  StoreManagerAssignment,
  StoreStaff
} from '../interfaces/store.interface';

// Add health check response interface
interface HealthCheckResponse {
  status: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  // Add cache for featured stores
  private featuredStoresCache: { [key: string]: { data: StoreListResponse, timestamp: number } } = {};
  // Cache timeout in ms (5 minutes)
  private cacheDuration = 5 * 60 * 1000;
  
  // Health check status 
  private backendHealthStatus = new BehaviorSubject<boolean>(false);
  
  constructor(
    private http: HttpClient,
    private errorService: ErrorService
  ) {
    // Initialize health check
    this.checkBackendStatus().subscribe();
  }

  // Add healthcheck method
  checkBackendStatus(): Observable<HealthCheckResponse> {
    return this.http.get<HealthCheckResponse>(`${environment.apiUrl}/health`)
      .pipe(
        timeout(3000), // Reduce timeout from 5s to 3s
        tap(response => {
          if (response && response.status === 'healthy') {
            this.backendHealthStatus.next(true);
          } else {
            this.backendHealthStatus.next(false);
          }
        }),
        catchError(error => {
          console.error('Backend health check failed:', error);
          this.backendHealthStatus.next(false);
          return of({ status: 'error', message: 'Backend is not responding' });
        }),
        // Share the same observable result to all subscribers
        shareReplay(1)
      );
  }

  // Get backend health status as observable
  getBackendHealthStatus(): Observable<boolean> {
    return this.backendHealthStatus.asObservable();
  }

  getAllStores(page: number = 1, limit: number = 10): Observable<StoreListResponse> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true // Enable sending cookies with cross-origin requests
    };
    
    console.log(`Fetching stores from ${environment.apiUrl}/stores/ with page=${page} and limit=${limit}`);
    
    return this.http.get<StoreListResponse>(`${environment.apiUrl}/stores/?page=${page}&limit=${limit}`, httpOptions)
      .pipe(
        timeout(15000), // Reduce timeout from 30s to 15s
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
    const cacheKey = `featured_${limit}`;
    const now = Date.now();
    
    // Check cache first
    if (this.featuredStoresCache[cacheKey] && 
        (now - this.featuredStoresCache[cacheKey].timestamp) < this.cacheDuration) {
      console.log('Returning featured stores from cache');
      return of(this.featuredStoresCache[cacheKey].data);
    }
    
    console.log(`Fetching featured stores with limit=${limit}`);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    };
    
    return this.http.get<StoreListResponse>(`${environment.apiUrl}/stores/?page=1&limit=${limit}&sort=rating`, httpOptions)
      .pipe(
        timeout(10000), // Reduce timeout from 30s to 10s
        retry(2), // Reduce retry attempts from 3 to 2
        tap(response => {
          // Save to cache
          if (response && response.stores) {
            this.featuredStoresCache[cacheKey] = {
              data: response,
              timestamp: now
            };
          }
        }),
        catchError(error => {
          console.error('Error in getFeaturedStores:', error);
          
          // Return empty store list on error
          return of({
            stores: [],
            total: 0,
            page: 1,
            limit: limit,
            total_pages: 0
          } as StoreListResponse);
        }),
        // Share the same observable result to all subscribers
        shareReplay(1)
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
    console.log(`Fetching store with ID: ${id} from ${environment.apiUrl}/stores/${id}`);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true  // Enable sending cookies with cross-origin requests
    };
    
    return this.http.get<Store>(`${environment.apiUrl}/stores/${id}`, httpOptions)
      .pipe(
        timeout(15000), // Increase timeout to 15 seconds
        tap(response => console.log(`Successfully fetched store with ID ${id}:`, response)),
        catchError((error: HttpErrorResponse) => {
          console.error(`Error fetching store with ID ${id}:`, error);
          let errorMsg = 'Failed to fetch store details';
          
          if (error.status === 0) {
            console.error('Network error - API is possibly down or CORS issues');
            errorMsg = 'Network error. Backend may be down or not responding.';
          } else if (error.status === 401) {
            console.error('Authentication error - user not logged in or token expired');
            errorMsg = 'You need to be logged in to view this store. Your session may have expired.';
          } else if (error.status === 403) {
            console.error('Permission error - user lacks access rights');
            errorMsg = 'You do not have permission to view this store.';
          } else if (error.status === 404) {
            console.error('Store not found - ID may be invalid');
            errorMsg = 'Store not found. The ID may be invalid.';
          } else if (error.error?.message) {
            console.error('Server error message:', error.error.message);
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
    console.log('Creating new store with data:', storeData);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true // Enable sending cookies with cross-origin requests
    };
    
    return this.http.post<StoreCreateResponse>(`${environment.apiUrl}/stores`, storeData, httpOptions)
      .pipe(
        timeout(15000),
        tap(response => console.log('Store creation succeeded:', response)),
        catchError((error: HttpErrorResponse) => {
          console.error('Error creating store:', error);
          let errorMsg = 'Failed to create store';
          
          if (error.status === 0) {
            errorMsg = 'Network error. Please check your connection.';
          } else if (error.status === 401) {
            errorMsg = 'You must be logged in to create a store';
          } else if (error.status === 403) {
            errorMsg = 'You do not have permission to create a store';
          } else if (error.status === 422) {
            errorMsg = 'Invalid store data. Please check your form input.';
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

  // Admin-specific store creation with owner assignment
  adminCreateStore(storeData: Partial<Store> & { owner: string }): Observable<StoreCreateResponse> {
    console.log('Admin creating new store with data:', storeData);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    };
    
    return this.http.post<StoreCreateResponse>(`${environment.apiUrl}/stores/admin/create`, storeData, httpOptions)
      .pipe(
        timeout(15000),
        tap(response => console.log('Admin store creation succeeded:', response)),
        catchError((error: HttpErrorResponse) => {
          console.error('Error in admin store creation:', error);
          let errorMsg = 'Failed to create store';
          
          if (error.status === 0) {
            errorMsg = 'Network error. Please check your connection.';
          } else if (error.status === 401) {
            errorMsg = 'You must be logged in as an admin';
          } else if (error.status === 403) {
            errorMsg = 'Admin privileges required';
          } else if (error.status === 404) {
            errorMsg = 'Owner user not found';
          } else if (error.status === 422) {
            errorMsg = 'Invalid store data. Please check your form input.';
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
        map(response => {
          // Transform to ensure all reviews have userName
          if (response && response.reviews && Array.isArray(response.reviews)) {
            return response.reviews.map((review: any) => {
              // If userName is missing, use user or userId or set to Anonymous
              if (!review.userName) {
                review.userName = review.userId || review.user || 'Anonymous';
              }
              return review;
            });
          }
          return [];
        }),
        catchError((error: HttpErrorResponse) => {
          console.error(`Error fetching reviews for store ${storeId}:`, error);
          // Don't show error message for reviews as it's not critical
          return of([]);
        })
      );
  }

  // Assign a store owner (admin only)
  assignStoreOwner(storeId: string, ownerUsername: string): Observable<any> {
    console.log(`Assigning owner "${ownerUsername}" to store ${storeId}`);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    };
    
    const data: StoreOwnerAssignment = { owner: ownerUsername };
    
    return this.http.put<any>(`${environment.apiUrl}/stores/${storeId}/owner`, data, httpOptions)
      .pipe(
        timeout(15000),
        tap(response => console.log('Owner assignment succeeded:', response)),
        catchError((error: HttpErrorResponse) => {
          console.error('Error assigning store owner:', error);
          let errorMsg = 'Failed to assign store owner';
          
          if (error.status === 0) {
            errorMsg = 'Network error. Please check your connection.';
          } else if (error.status === 401) {
            errorMsg = 'You must be logged in as an admin';
          } else if (error.status === 403) {
            errorMsg = 'Admin privileges required';
          } else if (error.status === 404) {
            errorMsg = 'Store or user not found';
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

  // Add a store manager
  addStoreManager(storeId: string, managerUsername: string): Observable<any> {
    console.log(`Adding manager "${managerUsername}" to store ${storeId}`);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    };
    
    const data: StoreManagerAssignment = { manager: managerUsername };
    
    return this.http.post<any>(`${environment.apiUrl}/stores/${storeId}/managers`, data, httpOptions)
      .pipe(
        timeout(15000),
        tap(response => console.log('Manager addition succeeded:', response)),
        catchError((error: HttpErrorResponse) => {
          console.error('Error adding store manager:', error);
          let errorMsg = 'Failed to add store manager';
          
          if (error.status === 0) {
            errorMsg = 'Network error. Please check your connection.';
          } else if (error.status === 401) {
            errorMsg = 'You must be logged in';
          } else if (error.status === 403) {
            errorMsg = 'You do not have permission to add managers to this store';
          } else if (error.status === 404) {
            errorMsg = 'Store or user not found';
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

  // Remove a store manager
  removeStoreManager(storeId: string, managerUsername: string): Observable<any> {
    console.log(`Removing manager "${managerUsername}" from store ${storeId}`);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    };
    
    return this.http.delete<any>(`${environment.apiUrl}/stores/${storeId}/managers/${managerUsername}`, httpOptions)
      .pipe(
        timeout(15000),
        tap(response => console.log('Manager removal succeeded:', response)),
        catchError((error: HttpErrorResponse) => {
          console.error('Error removing store manager:', error);
          let errorMsg = 'Failed to remove store manager';
          
          if (error.status === 0) {
            errorMsg = 'Network error. Please check your connection.';
          } else if (error.status === 401) {
            errorMsg = 'You must be logged in';
          } else if (error.status === 403) {
            errorMsg = 'You do not have permission to remove managers from this store';
          } else if (error.status === 404) {
            errorMsg = 'Store or user not found';
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

  // Get store staff (owner and managers)
  getStoreStaff(storeId: string): Observable<StoreStaff> {
    console.log(`Getting staff for store ${storeId}`);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    };
    
    return this.http.get<StoreStaff>(`${environment.apiUrl}/stores/${storeId}/staff`, httpOptions)
      .pipe(
        timeout(15000),
        tap(response => console.log('Got store staff:', response)),
        catchError((error: HttpErrorResponse) => {
          console.error('Error getting store staff:', error);
          let errorMsg = 'Failed to get store staff';
          
          if (error.status === 0) {
            errorMsg = 'Network error. Please check your connection.';
          } else if (error.status === 401) {
            errorMsg = 'You must be logged in';
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

  // Upload store image
  uploadStoreImage(file: File, storeId?: string): Observable<any> {
    console.log(`Uploading image for store ${storeId || '(new)'}`);
    
    const formData = new FormData();
    formData.append('file', file);
    
    if (storeId) {
      formData.append('store_id', storeId);
    }
    
    const httpOptions = {
      withCredentials: true
    };
    
    return this.http.post<any>(`${environment.apiUrl}/upload/store-image`, formData, httpOptions)
      .pipe(
        timeout(30000), // Uploads can take longer, so 30 second timeout
        tap(response => console.log('Image upload succeeded:', response)),
        catchError((error: HttpErrorResponse) => {
          console.error('Error uploading store image:', error);
          let errorMsg = 'Failed to upload image';
          
          if (error.status === 0) {
            errorMsg = 'Network error. Please check your connection.';
          } else if (error.status === 401) {
            errorMsg = 'You must be logged in';
          } else if (error.status === 403) {
            errorMsg = 'You do not have permission to upload images for this store';
          } else if (error.status === 413) {
            errorMsg = 'Image file size is too large';
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

  // Search for users (for owner/manager assignment)
  searchUsers(query: string): Observable<any> {
    console.log(`Searching for users with query: ${query}`);
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    };
    
    return this.http.get<any>(`${environment.apiUrl}/users/search?q=${encodeURIComponent(query)}`, httpOptions)
      .pipe(
        timeout(15000),
        tap(response => console.log('User search succeeded:', response)),
        catchError((error: HttpErrorResponse) => {
          console.error('Error searching users:', error);
          let errorMsg = 'Failed to search users';
          
          if (error.status === 0) {
            errorMsg = 'Network error. Please check your connection.';
          } else if (error.status === 401) {
            errorMsg = 'You must be logged in';
          } else if (error.status === 403) {
            errorMsg = 'You do not have permission to search users';
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

  clearCache(): void {
    this.featuredStoresCache = {};
  }
}