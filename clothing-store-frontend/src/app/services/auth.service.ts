// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;

  // Add to auth.service.ts
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

getUserRole(): string {
  const user = this.currentUserValue;
  if (!user || !user.token) {
    return 'guest';
  }
  
  const decodedToken = this.decodeToken(user.token);
  return decodedToken?.role || 'customer';
}

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser') || 'null'));
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string) {
    return this.http.post<any>(`${environment.apiUrl}/login`, { username, password })
      .pipe(map(response => {
        if (response && response.access_token) {
          // Store user details and jwt token in local storage
          const token = response.access_token;
          const user = { username, token };
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
        return response;
      }));
  }

  register(username: string, password: string, role: string = 'customer') {
    return this.http.post<any>(`${environment.apiUrl}/register`, { username, password, role });
  }

  logout() {
    // Remove user from local storage
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    // Call logout endpoint
    return this.http.post(`${environment.apiUrl}/logout`, {});
  }

  isLoggedIn() {
    return this.currentUserValue !== null;
  }
}

