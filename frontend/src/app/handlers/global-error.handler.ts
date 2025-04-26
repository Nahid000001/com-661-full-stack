import { ErrorHandler, Injectable, NgZone } from '@angular/core';
import { ErrorService } from '../services/error.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private errorService: ErrorService,
    private zone: NgZone
  ) {}

  handleError(error: any): void {
    // Extract meaningful error message
    let errorMessage = 'An unknown error occurred';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Log error to the console
    console.error('Global error handler caught an error:', error);
    
    // Use NgZone to ensure Angular's change detection is triggered
    this.zone.run(() => {
      // Set the error in our error service
      this.errorService.setError(errorMessage);
    });
  }
} 