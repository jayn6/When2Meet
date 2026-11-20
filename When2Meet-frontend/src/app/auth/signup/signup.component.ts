import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';

import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {

  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (password !== confirmPassword) {
    return { passwordMismatch: true };
  }

  return null;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {

  signupForm: FormGroup;

  loading = false;
  errorMessage = '';
  successMessage = '';

  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {

    this.signupForm = this.fb.group({

      fullName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150)
        ]
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8)
        ]
      ],

      confirmPassword: [
        '',
        Validators.required
      ]

    }, {
      validators: passwordMatchValidator
    });
  }

  get f() {
    return this.signupForm.controls;
  }

  onSubmit(): void {

    this.errorMessage = '';
    this.successMessage = '';

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const data = {
      fullName: this.f['fullName'].value.trim(),
      email: this.f['email'].value.trim(),
      password: this.f['password'].value
    };

    this.authService.signup(data).subscribe({

      next: () => {

        this.loading = false;

        this.successMessage = 'Account created successfully!';

        this.router.navigate(['/calendar']);
      },

      error: (error) => {

        this.loading = false;

        if (error.status === 409) {
          this.errorMessage = 'This email is already registered.';
        } else if (error.status === 0) {
          this.errorMessage = 'Cannot connect to the server.';
        } else {
          this.errorMessage =
            error.error?.message || 'Something went wrong. Please try again.';
        }
      }
    });
  }
}