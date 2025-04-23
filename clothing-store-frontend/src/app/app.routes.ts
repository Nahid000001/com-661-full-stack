// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { StoreListComponent } from './components/store-list/store-list.component';
import { StoreDetailComponent } from './components/store-detail/store-detail.component';
import { OAuthCallbackComponent } from './components/oauth-callback/oauth-callback.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { ProfileComponent } from './components/profile/profile.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'stores', component: StoreListComponent },
  { path: 'stores/:id', component: StoreDetailComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [() => authGuard()] },
  { path: 'auth/callback/:provider', component: OAuthCallbackComponent },
  { path: 'auth/callback/google', component: AuthCallbackComponent },
  { path: '**', redirectTo: '' }
];