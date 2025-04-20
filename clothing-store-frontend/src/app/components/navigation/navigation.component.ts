// src/app/components/navigation/navigation.component.ts
import { Component, OnInit } from '@angular/core';
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
  isAdmin = false;       // Add this property
  isStoreOwner = false;  // Add this property

  constructor(private authService: AuthService) { }

// In navigation.component.ts
ngOnInit() {
  this.authService.currentUser.subscribe(user => {
    this.isLoggedIn = !!user;
    this.currentUser = user;
    
    if (user && user.token) {
      const payload = this.authService.decodeToken(user.token);
      const role = payload?.role || 'customer';
      
      this.isAdmin = role === 'admin';
      this.isStoreOwner = role === 'store_owner';
    } else {
      this.isAdmin = false;
      this.isStoreOwner = false;
    }
  });
}

  logout() {
    this.authService.logout().subscribe();
  }
}