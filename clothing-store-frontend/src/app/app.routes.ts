// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { OAuthCallbackComponent } from './components/oauth-callback/oauth-callback.component';

export const routes: Routes = [
  { 
    path: '', 
    pathMatch: 'full',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'auth/callback',
    component: OAuthCallbackComponent
  },
  { 
    path: 'stores',
    loadComponent: () => import('./components/store-list/store-list.component').then(m => m.StoreListComponent)
  },
  { 
    path: 'stores/:id',
    loadComponent: () => import('./components/store-detail/store-detail.component').then(m => m.StoreDetailComponent)
  },
  { 
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  { 
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent)
  },
  { 
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
  },
  { 
    path: 'health-check',
    loadComponent: () => import('./components/health-check/health-check.component').then(m => m.HealthCheckComponent)
  },
  { 
    path: '**', 
    redirectTo: '' 
  }
];