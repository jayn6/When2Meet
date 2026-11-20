import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  loginForm: FormGroup;

  loading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {

    this.loginForm = this.fb.group({

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      password: [
        '',
        Validators.required
      ]

    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {

    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const data = {
      email: this.f['email'].value.trim(),
      password: this.f['password'].value
    };

    this.authService.login(data).subscribe({

      next: () => {

        this.loading = false;

        this.router.navigate(['/calendar']);
      },

      error: (error) => {

        this.loading = false;

        if (error.status === 401) {
          this.errorMessage = 'Incorrect email or password.';
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to the server.';
        } else {
          this.errorMessage =
            error.error?.message || 'Login failed. Please try again.';
        }
      }
    });
  }
}