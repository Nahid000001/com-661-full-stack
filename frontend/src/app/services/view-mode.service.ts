import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export enum ViewMode {
  Admin = 'admin',
  User = 'user'
}

@Injectable({
  providedIn: 'root'
})
export class ViewModeService {
  // Use BehaviorSubject to maintain state across components
  private viewModeSubject = new BehaviorSubject<ViewMode>(ViewMode.Admin);
  
  constructor() {
    this.initializeViewMode();
  }
  
  // Initialize view mode based on localStorage or defaults
  private initializeViewMode(): void {
    // Try to load saved preference from localStorage
    const savedMode = localStorage.getItem('viewMode');
    if (savedMode && Object.values(ViewMode).includes(savedMode as ViewMode)) {
      this.viewModeSubject.next(savedMode as ViewMode);
    } else {
      // Default to Admin view for admin users
      // The auth check will happen in components that use this service
      this.viewModeSubject.next(ViewMode.Admin);
      localStorage.setItem('viewMode', ViewMode.Admin);
    }
  }
  
  // Get the current view mode as an observable
  getViewMode(): Observable<ViewMode> {
    return this.viewModeSubject.asObservable();
  }
  
  // Get the current view mode value
  getCurrentViewMode(): ViewMode {
    return this.viewModeSubject.value;
  }
  
  // Set a new view mode
  setViewMode(mode: ViewMode): void {
    // Save preference to localStorage for persistence
    localStorage.setItem('viewMode', mode);
    this.viewModeSubject.next(mode);
  }
  
  // Check if current mode is admin
  isAdminMode(): boolean {
    return this.viewModeSubject.value === ViewMode.Admin;
  }
  
  // Check if current mode is user
  isUserMode(): boolean {
    return this.viewModeSubject.value === ViewMode.User;
  }
} 