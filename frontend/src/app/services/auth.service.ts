// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, switchMap, tap, filter, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;
  private refreshTokenInProgress = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  // Decode JWT token to get payload
  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (e) {
      console.error('Error decoding token', e);
      return null;
    }
  }

  // Get user role from token
  getUserRole(): string {
    const user = this.currentUserValue;
    if (!user || !user.token) {
      return 'guest';
    }
    
    const decodedToken = this.decodeToken(user.token);
    return decodedToken?.role || 'customer';
  }

  // Get user ID from token
  getUserId(): string | null {
    const user = this.currentUserValue;
    if (!user || !user.token) {
      return null;
    }
    
    const decodedToken = this.decodeToken(user.token);
    return decodedToken?.sub || null;
  }

  constructor(private http: HttpClient, private router: Router) {
    this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser') || 'null'));
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Setup automatic token refresh
    this.setupAutoRefresh();
  }

  // Update current user directly
  updateCurrentUser(user: any): void {
    this.currentUserSubject.next(user);
  }

  // Setup token refresh 
  private setupAutoRefresh() {
    // Check every minute if token is about to expire
    setInterval(() => {
      const user = this.currentUserValue;
      if (!user || !user.token) return;
      
      const tokenPayload = this.decodeToken(user.token);
      if (!tokenPayload) return;
      
      // If token expires in less than 10 minutes, refresh it
      const expiryTime = tokenPayload.exp * 1000; // convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      
      if (timeUntilExpiry < 600000 && timeUntilExpiry > 0) { // less than 10 minutes
        this.refreshToken().subscribe();
      }
    }, 60000); // Check every minute
  }

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    };
    
    return this.http.post<any>(`${environment.apiUrl}/login`, { emailOrUsername: username, password }, httpOptions)
      .pipe(map(response => {
        if (response && response.access_token) {
          // Store user details and jwt token in local storage
          const token = response.access_token;
          const decodedToken = this.decodeToken(token);
          const userId = decodedToken?.sub || null;
          
          const user = { 
            username, 
            token, 
            refreshToken: response.refresh_token,
            userId: userId
          };
          
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
        return response;
      }));
  }

  register(email: string, username: string, password: string, role: string = 'customer') {
    return this.http.post<any>(`${environment.apiUrl}/register`, { email, username, password, role });
  }

  // Initiate Google OAuth login/register flow
  initiateGoogleLogin(role: string = 'customer'): Observable<string> {
    return this.http.get<{ authUrl: string }>(`${environment.apiUrl}/auth/google/init?role=${role}`)
      .pipe(
        map(response => response.authUrl),
        catchError(error => {
          console.error('Error initiating Google login', error);
          return throwError(() => error);
        })
      );
  }

  // Handle OAuth callback
  handleOAuthCallback(provider: string, code: string, state: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/${provider}/callback`, { code, state })
      .pipe(
        map(response => {
          if (response && response.access_token) {
            // Store user details and jwt token in local storage
            const token = response.access_token;
            const decodedToken = this.decodeToken(token);
            const userId = decodedToken?.sub || null;
            
            const user = { 
              username: response.username, 
              token, 
              refreshToken: response.refresh_token,
              userId: userId 
            };
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.currentUserSubject.next(user);
          }
          return response;
        }),
        catchError(error => {
          console.error(`Error handling ${provider} callback`, error);
          return throwError(() => error);
        })
      );
  }

  // Refresh token
  refreshToken() {
    // Prevent multiple refreshes
    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.pipe(
        filter(result => result !== null),
        take(1),
        switchMap(() => this.refreshTokenInternal())
      );
    } else {
      this.refreshTokenInProgress = true;
      this.refreshTokenSubject.next(null);
      
      return this.refreshTokenInternal();
    }
  }
  
  private refreshTokenInternal() {
    const user = this.currentUserValue;
    if (!user || !user.refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.refreshToken}`
      }),
      withCredentials: true
    };
    
    return this.http.post<any>(`${environment.apiUrl}/refresh`, {}, httpOptions).pipe(
      map(response => {
        if (response && response.access_token) {
          // Update stored token
          const updatedUser = {
            ...user,
            token: response.access_token
          };
          
          if (response.refresh_token) {
            updatedUser.refreshToken = response.refresh_token;
          }
          
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
        }
        
        this.refreshTokenInProgress = false;
        this.refreshTokenSubject.next(response);
        return response;
      }),
      catchError(error => {
        this.refreshTokenInProgress = false;
        this.refreshTokenSubject.next(false);
        
        // If refresh fails, logout the user
        if (error.status === 401) {
          this.logout();
        }
        
        return throwError(() => error);
      })
    );
  }

  logout() {
    // Revoke token on the server (best practice)
    const user = this.currentUserValue;
    if (user && user.token) {
      const refreshJti = this.decodeToken(user.refreshToken)?.jti;
      
      const httpOptions = refreshJti ? {
        headers: new HttpHeaders({
          'X-Refresh-Token-JTI': refreshJti
        })
      } : undefined;
      
      this.http.post(`${environment.apiUrl}/logout`, {}, httpOptions).subscribe({
        next: () => this.clearUserData(),
        error: () => this.clearUserData()
      });
    } else {
      this.clearUserData();
    }
  }

  private clearUserData(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn() {
    const currentUser = this.currentUserValue;
    if (!currentUser) {
      return false;
    }
    
    // Check if token is expired
    return !this.isTokenExpired(currentUser.token);
  }

  isTokenExpired(token: string): boolean {
    if (!token) return true;
    
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;
    
    const expiryTime = payload.exp * 1000; // convert to milliseconds
    return Date.now() > expiryTime;
  }

  // For auth interceptor to add token to requests
  getAuthorizationToken(): string {
    const currentUser = this.currentUserValue;
    return currentUser && currentUser.token ? currentUser.token : '';
  }

  // Check if the current user has a specific role
  hasRole(role: string | string[]): boolean {
    const user = this.currentUserValue;
    console.log('hasRole check - User:', user);
    if (!user || !user.token) {
      console.log('hasRole check - No user or token');
      return false;
    }
    
    // First check if role is directly in the user object (for workarounds)
    if (user.role) {
      console.log('hasRole check - Using role from user object:', user.role);
      if (Array.isArray(role)) {
        return role.includes(user.role);
      }
      return user.role === role;
    }
    
    // Then check token payload
    const payload = this.decodeToken(user.token);
    console.log('hasRole check - Token payload:', payload);
    const userRole = payload?.role;
    console.log('hasRole check - User role:', userRole, 'Checking for role:', role);
    
    if (!userRole) {
      console.log('hasRole check - No role found in token');
      return false;
    }
    
    if (Array.isArray(role)) {
      const hasRequiredRole = role.includes(userRole);
      console.log('hasRole check - Array check result:', hasRequiredRole);
      return hasRequiredRole;
    }
    
    const hasRequiredRole = userRole === role;
    console.log('hasRole check - String check result:', hasRequiredRole);
    return hasRequiredRole;
  }

  // Get detailed information about the current authentication state
  getAuthState() {
    const currentUser = this.currentUserValue;
    if (!currentUser) {
      return {
        isLoggedIn: false,
        username: null,
        userId: null,
        role: 'guest',
        token: null
      };
    }
    
    // Check if token is expired
    const isExpired = this.isTokenExpired(currentUser.token);
    
    if (isExpired) {
      return {
        isLoggedIn: false,
        username: null,
        userId: null,
        role: 'guest',
        token: null,
        tokenExpired: true
      };
    }
    
    const decodedToken = this.decodeToken(currentUser.token);
    
    return {
      isLoggedIn: true,
      username: currentUser.username,
      userId: currentUser.userId || decodedToken?.sub,
      role: decodedToken?.role || 'customer',
      token: currentUser.token
    };
  }
}

