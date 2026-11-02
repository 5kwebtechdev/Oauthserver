import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from './auth.service';

export interface AuthState {
  isAuthenticated: boolean;
  user: any;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null
  };

  private authStateSubject = new BehaviorSubject<AuthState>(this.initialState);
  public authState$ = this.authStateSubject.asObservable();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Check if user is already logged in on service initialization
    this.checkInitialAuthState();
  }

  private checkInitialAuthState(): void {
    const token = this.authService.getToken();
    if (token) {
      // In a real app, you might want to validate the token with the server
      this.updateAuthState({
        isAuthenticated: true,
        user: { id: this.authService.getUserId() },
        loading: false,
        error: null
      });
    }
  }

  private updateAuthState(newState: Partial<AuthState>): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({ ...currentState, ...newState });
  }

  login(credentials: any): Observable<AuthResponse> {
    this.updateAuthState({ loading: true, error: null });
    
    return new Observable(observer => {
      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.updateAuthState({
            isAuthenticated: true,
            user: { id: response.userId },
            loading: false,
            error: null
          });
          observer.next(response);
          observer.complete();
        },
        error: (error) => {
          this.updateAuthState({
            loading: false,
            error: error.error?.message || 'Login failed'
          });
          observer.error(error);
        }
      });
    });
  }

  logout(): void {
    this.authService.logout();
    this.authStateSubject.next(this.initialState);
  }

  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  getUser(): any {
    return this.authStateSubject.value.user;
  }

  isLoading(): boolean {
    return this.authStateSubject.value.loading;
  }

  getError(): string | null {
    return this.authStateSubject.value.error;
  }
}
