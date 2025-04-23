// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { StoreListComponent } from './components/store-list/store-list.component';
import { StoreDetailComponent } from './components/store-detail/store-detail.component';
import { OAuthCallbackComponent } from './components/oauth-callback/oauth-callback.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'stores', component: StoreListComponent },
  { path: 'stores/:id', component: StoreDetailComponent },
  { path: 'auth/callback/:provider', component: OAuthCallbackComponent },
  { path: 'auth/callback/google', component: AuthCallbackComponent },
  { path: '**', redirectTo: '' }
];