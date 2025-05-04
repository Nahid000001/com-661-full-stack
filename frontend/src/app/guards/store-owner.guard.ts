import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const storeOwnerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.hasRole(['admin', 'store_owner'])) {
    return true;
  }
  
  // If not store owner or admin, redirect to home page
  router.navigate(['/']);
  return false;
}; 