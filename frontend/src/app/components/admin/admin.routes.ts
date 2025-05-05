import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
  },
  {
    path: 'stores',
    loadComponent: () => import('./admin-stores/admin-stores.component').then(m => m.AdminStoresComponent),
  },
  {
    path: 'stores/add',
    loadComponent: () => import('./admin-stores/admin-add-store.component').then(m => m.AdminAddStoreComponent),
  },
  {
    path: 'users',
    loadComponent: () => import('./admin-users/admin-users.component').then(m => m.AdminUsersComponent),
  },
  {
    path: 'reviews',
    loadComponent: () => import('./admin-reviews/admin-reviews.component').then(m => m.AdminReviewsComponent),
  }
]; 