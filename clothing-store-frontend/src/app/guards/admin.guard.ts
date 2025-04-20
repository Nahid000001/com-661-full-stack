// src/app/guards/admin.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function adminGuard() {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  if (authService.isLoggedIn()) {
    const role = authService.getUserRole();
    if (role === 'admin') {
      return true;
    }
  }
  
  return router.parseUrl('/');
}