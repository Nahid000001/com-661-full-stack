// src/app/interceptors/error.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return next(req).pipe(
    catchError(err => {
      if (err.status === 401) {
        // Auto logout if 401 response returned from api
        authService.logout();
        router.navigate(['/login']);
      }
      
      const error = err.error?.message || err.statusText;
      return throwError(() => error);
    })
  );
};