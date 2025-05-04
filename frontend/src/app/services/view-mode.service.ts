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
    // Try to load saved preference from localStorage
    const savedMode = localStorage.getItem('viewMode');
    if (savedMode && Object.values(ViewMode).includes(savedMode as ViewMode)) {
      this.viewModeSubject.next(savedMode as ViewMode);
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