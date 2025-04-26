import { HttpErrorResponse, HttpInterceptorFn, HttpEvent, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<any>(null);

export const tokenRefreshInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  
  return next(req).pipe(
    catchError((error: any) => {
      if (error instanceof HttpErrorResponse && 
          error.status === 401 && 
          authService.isLoggedIn() && 
          !req.url.includes('refresh-token')) {
        return handleTokenRefresh(req, next, authService);
      }
      
      return throwError(() => error);
    })
  );
};

function handleTokenRefresh(req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);
    
    return authService.refreshToken().pipe(
      switchMap((token: any) => {
        refreshTokenSubject.next(token);
        return next(addTokenToRequest(req, token.accessToken));
      }),
      catchError((error) => {
        authService.logout();
        return throwError(() => error);
      }),
      finalize(() => {
        isRefreshing = false;
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        return next(addTokenToRequest(req, token.accessToken));
      })
    );
  }
}

function addTokenToRequest(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
} 