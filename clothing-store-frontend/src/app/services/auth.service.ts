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

  // Check if token is expired
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    const expirationDate = new Date(0);
    expirationDate.setUTCSeconds(decoded.exp);
    return expirationDate.valueOf() <= new Date().valueOf();
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

  // Set up automatic token refresh
  private setupAutoRefresh() {
    // Check if token needs refresh every minute
    setInterval(() => {
      const user = this.currentUserValue;
      if (user && user.token) {
        const decoded = this.decodeToken(user.token);
        
        // If token expires in the next 5 minutes, refresh it
        if (decoded && decoded.exp) {
          const expirationDate = new Date(0);
          expirationDate.setUTCSeconds(decoded.exp);
          const now = new Date();
          const fiveMinutes = 5 * 60 * 1000;
          
          if (expirationDate.valueOf() - now.valueOf() < fiveMinutes) {
            this.refreshToken().subscribe();
          }
        }
      }
    }, 60000); // Check every minute
  }

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string) {
    return this.http.post<any>(`${environment.apiUrl}/login`, { emailOrUsername: username, password })
      .pipe(map(response => {
        if (response && response.access_token) {
          // Store user details and jwt token in local storage
          const token = response.access_token;
          const user = { username, token, refreshToken: response.refresh_token };
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
            const user = { 
              username: response.username, 
              token, 
              refreshToken: response.refresh_token 
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

  logout() {
    // Call logout endpoint with token information
    const currentUser = this.currentUserValue;
    if (currentUser?.refreshToken) {
      const jti = this.decodeToken(currentUser.refreshToken)?.jti;
      if (jti) {
        const headers = new HttpHeaders({
          'X-Refresh-Token-JTI': jti
        });
        
        return this.http.delete(`${environment.apiUrl}/logout`, { headers }).pipe(
          tap(() => {
            this.clearUserData();
          }),
          catchError(error => {
            console.error('Logout error', error);
            this.clearUserData();
            return of(null);
          })
        );
      } else {
        this.clearUserData();
        return of(null);
      }
    } else {
      this.clearUserData();
      return of(null);
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
  
  refreshToken(): Observable<any> {
    // If refresh already in progress, wait for it
    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.pipe(
        filter((result: any) => result !== null),
        take(1),
        switchMap(() => this.refreshToken())
      );
    }

    this.refreshTokenInProgress = true;
    this.refreshTokenSubject.next(null);
    
    const currentUser = this.currentUserValue;
    if (!currentUser || !currentUser.refreshToken) {
      // If no refresh token is available, log the user out
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }
    
    return this.http.post<any>(`${environment.apiUrl}/refresh`, {}, {
      headers: {
        'Authorization': `Bearer ${currentUser.refreshToken}`
      }
    }).pipe(
      map(response => {
        if (response && response.access_token) {
          // Update stored user details with new tokens
          const updatedUser = {
            ...currentUser,
            token: response.access_token,
            refreshToken: response.refresh_token || currentUser.refreshToken
          };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
          
          this.refreshTokenInProgress = false;
          this.refreshTokenSubject.next(response);
          
          return {
            accessToken: response.access_token,
            refreshToken: response.refresh_token
          };
        }
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        this.refreshTokenInProgress = false;
        
        // If refresh token is invalid, log out the user
        if (error.status === 401) {
          this.logout();
        }
        
        return throwError(() => error);
      })
    );
  }

  // Check if the current user has a specific role
  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    if (!user || !user.token) return false;
    
    const payload = this.decodeToken(user.token);
    return payload?.role === role;
  }
}

