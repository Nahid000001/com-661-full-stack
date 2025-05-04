// src/app/components/navigation/navigation.component.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  isLoggedIn = false;
  currentUser: any = null;
  isAdmin = false;
  isStoreOwner = false;
  isMobileMenuOpen = false;
  isUserDropdownOpen = false;

  constructor(private authService: AuthService) { }

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = !!user;
      this.currentUser = user;
      
      if (user && user.token) {
        this.isAdmin = this.authService.hasRole('admin');
        this.isStoreOwner = this.authService.hasRole('store_owner');
      } else {
        this.isAdmin = false;
        this.isStoreOwner = false;
      }
    });
  }

  logout() {
    this.authService.logout();
    this.isUserDropdownOpen = false;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Close user dropdown if open
    if (this.isMobileMenuOpen) {
      this.isUserDropdownOpen = false;
    }
  }

  toggleUserDropdown(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  getUserInitial(): string {
    return this.currentUser?.username ? this.currentUser.username.charAt(0).toUpperCase() : 'U';
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // Check if the click is outside the dropdown
    if (this.isUserDropdownOpen && !target.closest('.dropdown')) {
      this.isUserDropdownOpen = false;
    }
    
    // Close mobile menu on outside click if in mobile view
    if (window.innerWidth < 992 && this.isMobileMenuOpen && !target.closest('.navbar')) {
      this.isMobileMenuOpen = false;
    }
  }
}