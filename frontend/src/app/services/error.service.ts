import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private errorSubject = new BehaviorSubject<string>('');
  error$: Observable<string> = this.errorSubject.asObservable();
  
  constructor() { }
  
  // Set an error message
  setError(message: string, autoClear: boolean = true): void {
    this.errorSubject.next(message);
    
    // Auto-clear error after 5 seconds if autoClear is true
    if (autoClear) {
      setTimeout(() => {
        if (this.errorSubject.value === message) {
          this.clearError();
        }
      }, 5000);
    }
  }
  
  // Clear the error message
  clearError(): void {
    this.errorSubject.next('');
  }
  
  // Get the current error as an observable
  getError(): Observable<string> {
    return this.errorSubject.asObservable();
  }
  
  // Check if there is an active error message
  hasActiveError(): boolean {
    return !!this.errorSubject.value;
  }
} 