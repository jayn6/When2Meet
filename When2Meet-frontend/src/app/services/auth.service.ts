import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import {
  SignupRequest,
  LoginRequest,
  AuthResponse
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/auth';

  private readonly TOKEN_KEY = 'uniflow_token';
  private readonly USER_KEY = 'uniflow_user';

  constructor(private http: HttpClient) {}

  // SIGNUP
  signup(data: SignupRequest): Observable<AuthResponse> {

    return this.http.post<AuthResponse>(
      `${this.apiUrl}/signup`,
      data
    ).pipe(
      tap(response => this.saveSession(response))
    );
  }

  // LOGIN
  login(data: LoginRequest): Observable<AuthResponse> {

    return this.http.post<AuthResponse>(
      `${this.apiUrl}/login`,
      data
    ).pipe(
      tap(response => this.saveSession(response))
    );
  }

  // SAVE TOKEN AND USER
  private saveSession(response: AuthResponse): void {

    sessionStorage.setItem(
      this.TOKEN_KEY,
      response.token
    );

    sessionStorage.setItem(
      this.USER_KEY,
      JSON.stringify({
        userId: response.userId,
        fullName: response.fullName,
        email: response.email
      })
    );
  }

  // GET TOKEN
  getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  // GET CURRENT USER
  getCurrentUser(): {
    userId: number;
    fullName: string;
    email: string;
  } | null {

    const user = sessionStorage.getItem(this.USER_KEY);

    return user ? JSON.parse(user) : null;
  }

  // CHECK LOGIN
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // LOGOUT
  logout(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  }
}