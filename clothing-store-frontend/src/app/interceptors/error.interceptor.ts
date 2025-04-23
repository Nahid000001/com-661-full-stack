// src/app/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ErrorService } from '../services/error.service';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const errorService = inject(ErrorService);
  const router = inject(Router);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unknown error occurred';
      let shouldShowError = true;
      
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 0:
            // Connection error - don't show any message
            errorMessage = '';
            shouldShowError = false;
            break;
          case 400:
            errorMessage = 'Bad request. Please check your input';
            break;
          case 401:
            // Auto logout if 401 response returned from api
            authService.logout();
            router.navigate(['/login']);
            errorMessage = 'Your session has expired. Please log in again';
            break;
          case 403:
            errorMessage = 'You do not have permission to perform this action';
            break;
          case 404:
            errorMessage = 'Resource not found';
            break;
          case 422:
            errorMessage = 'Validation error. Please check your input';
            break;
          case 429:
            errorMessage = 'Too many requests. Please try again later';
            break;
          case 500:
            errorMessage = 'Server error occurred. Please try again later';
            break;
          default:
            errorMessage = `Error ${error.status}: ${error.statusText}`;
            break;
        }
        
        // Use server provided message if available
        if (error.error && shouldShowError) {
          if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.msg) {
            errorMessage = error.error.msg;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
        }
      }
      
      // Skip error display for certain URLs (e.g., health check) or when shouldShowError is false
      if (!req.url.includes('/health') && shouldShowError && errorMessage) {
        // Display the error using the error service
        errorService.setError(errorMessage);
      }
      
      // Return the error with a formatted message
      return throwError(() => ({ 
        status: error.status, 
        message: errorMessage,
        original: error 
      }));
    })
  );
};