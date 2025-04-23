// src/app/components/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['customer']
    });
  }

  get f() { return this.registerForm.controls; }

  onSubmit() {
    this.submitted = true;

    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.register(
      this.f['username'].value, 
      this.f['password'].value,
      this.f['role'].value
    ).subscribe({
      next: () => {
        this.router.navigate(['/login'], { queryParams: { registered: true }});
      },
      error: error => {
        this.error = error.error.message || 'Registration failed';
        this.loading = false;
      }
    });
  }

  // Google registration
  registerWithGoogle() {
    this.loading = true;
    // Use the role selected in the form for the Google registration
    const role = this.f['role'].value || 'customer';
    this.authService.initiateGoogleLogin(role)
      .subscribe({
        next: (url) => {
          // Redirect to Google login page
          window.location.href = url;
        },
        error: error => {
          this.error = error.error?.message || 'Failed to initiate Google registration';
          this.loading = false;
        }
      });
  }
}