import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: number;
}

export interface UserSession {
  userId: number;
  token: string;
  loginTime: number;
  lastActivity: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  // Observable to track authentication state
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidSession());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Observable to track current user
  private currentUserSubject = new BehaviorSubject<UserSession | null>(this.getCurrentSession());
  public currentUser$ = this.currentUserSubject.asObservable();

  // Session timeout configuration (in milliseconds)
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

  // Storage keys
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_ID_KEY = 'user_id';
  private readonly LOGIN_TIME_KEY = 'login_time';
  private readonly LAST_ACTIVITY_KEY = 'last_activity';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initSessionMonitoring();
  }

  /**
   * Initialize session monitoring to track user activity and session expiration
   */
  private initSessionMonitoring(): void {
    // Check session validity periodically
    timer(0, this.TOKEN_REFRESH_INTERVAL).subscribe(() => {
      this.checkSessionValidity();
    });

    // Track user activity
    if (typeof window !== 'undefined') {
      ['click', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => this.updateLastActivity(), { passive: true });
      });
    }
  }

  /**
   * Check if there's a valid session in localStorage
   */
  private hasValidSession(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);

    if (!token || !lastActivity) {
      return false;
    }

    const lastActivityTime = parseInt(lastActivity, 10);
    const currentTime = Date.now();
    const timeSinceLastActivity = currentTime - lastActivityTime;

    return timeSinceLastActivity < this.SESSION_TIMEOUT;
  }

  /**
   * Get current session from localStorage
   */
  private getCurrentSession(): UserSession | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userId = localStorage.getItem(this.USER_ID_KEY);
    const loginTime = localStorage.getItem(this.LOGIN_TIME_KEY);
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);

    if (!token || !userId) {
      return null;
    }

    return {
      userId: parseInt(userId, 10),
      token,
      loginTime: loginTime ? parseInt(loginTime, 10) : Date.now(),
      lastActivity: lastActivity ? parseInt(lastActivity, 10) : Date.now()
    };
  }

  /**
   * Check session validity and handle expiration
   */
  private checkSessionValidity(): void {
    const isValid = this.hasValidSession();

    if (!isValid && this.isAuthenticatedSubject.value) {
      console.log('[AuthService] Session expired, logging out');
      this.logout();
    } else if (isValid !== this.isAuthenticatedSubject.value) {
      this.isAuthenticatedSubject.next(isValid);
      this.currentUserSubject.next(this.getCurrentSession());
    }
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(): void {
    if (this.isLoggedIn()) {
      const currentTime = Date.now().toString();
      localStorage.setItem(this.LAST_ACTIVITY_KEY, currentTime);

      // Update current user subject
      const currentSession = this.currentUserSubject.value;
      if (currentSession) {
        this.currentUserSubject.next({
          ...currentSession,
          lastActivity: Date.now()
        });
      }
    }
  }

  /**
   * Login user with credentials
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    console.log('[AuthService] Login attempt with:', {
      endpoint: `${this.apiUrl}/auth/login`,
      credentials: { ...credentials, password: '***' },
      timestamp: new Date().toISOString()
    });

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap({
          next: (response) => {
            console.log('[AuthService] Login successful:', {
              userId: response.userId,
              hasToken: !!response.token,
              timestamp: new Date().toISOString()
            });

            if (response && response.token) {
              this.setSession(response);
            }
          },
          error: (error) => {
            console.error('[AuthService] Login failed:', {
              status: error.status,
              statusText: error.statusText,
              message: error.message,
              url: error.url,
              error: error.error,
              timestamp: new Date().toISOString()
            });
          }
        })
      );
  }

  /**
   * Set user session after successful login
   */
  private setSession(authResponse: AuthResponse): void {
    const currentTime = Date.now().toString();

    localStorage.setItem(this.TOKEN_KEY, authResponse.token);
    localStorage.setItem(this.USER_ID_KEY, authResponse.userId.toString());
    localStorage.setItem(this.LOGIN_TIME_KEY, currentTime);
    localStorage.setItem(this.LAST_ACTIVITY_KEY, currentTime);

    console.log('[AuthService] Session established:', {
      userId: authResponse.userId,
      loginTime: new Date(parseInt(currentTime)).toISOString()
    });

    // Update observables
    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next({
      userId: authResponse.userId,
      token: authResponse.token,
      loginTime: parseInt(currentTime, 10),
      lastActivity: parseInt(currentTime, 10)
    });
  }

  requestOtp(identifier: string) {
    const headers = environment.apiAuthToken ? new HttpHeaders({
      Authorization: environment.apiAuthToken,
      'Content-Type': 'application/json'
    }) : undefined;

    const url = `${this.apiUrl}/auth/forgot-password/request-otp`;

    const options: any = {
      responseType: 'text'
    };

    if (headers) {
      options.headers = headers;
    }

    return this.http.post<string>(url, { identifier }, options);
  }

  verifyOtp(identifier: string, otp: string) {
    const url = `${this.apiUrl}/auth/forgot-password/verify-otp`;

    const headers = environment.apiAuthToken ? new HttpHeaders({
      Authorization: environment.apiAuthToken,
      'Content-Type': 'application/json'
    }) : undefined;

    const options: any = {
      responseType: 'text'
    };

    if (headers) {
      options.headers = headers;
    }

    return this.http.post<string>(url, { identifier, otp }, options);
  }

  resetPassword(identifier: string, newPassword: string, confirmPassword: string) {
    const url = `${this.apiUrl}/auth/forgot-password/reset`;

    const headers = environment.apiAuthToken ? new HttpHeaders({
      Authorization: environment.apiAuthToken,
      'Content-Type': 'application/json'
    }) : undefined;

    const options: any = {
      responseType: 'text'
    };

    if (headers) {
      options.headers = headers;
    }

    return this.http.post<string>(url, { identifier, newPassword, confirmPassword }, options);
  }

  register(payload: any) {
    const url = `${this.apiUrl}/auth/register`;
    return this.http.post<any>(url, payload);
  }

  registerRequestOtp(identifier: string, isEmail: boolean, countryCode?: string) {
    const headers = environment.apiAuthToken ? new HttpHeaders({
      Authorization: environment.apiAuthToken,
      'Content-Type': 'application/json'
    }) : undefined;

    const url = `${this.apiUrl}/auth/register/generate-otp`;

    const options: any = {
      responseType: 'text'
    };

    if (headers) {
      options.headers = headers;
    }

    const payload = isEmail
      ? { email: identifier, "identifierType": "EMAIL" }
      : { phone: identifier, "identifierType": "PHONE" };

    return this.http.post<string>(url, payload, options);
  }

  registerVerifyOtp(identifier: string, otp: string, isEmail: boolean, countryCode?: string) {
    const url = `${this.apiUrl}/auth/register/verify-otp`;

    const headers = environment.apiAuthToken ? new HttpHeaders({
      Authorization: environment.apiAuthToken,
      'Content-Type': 'application/json'
    }) : undefined;

    const options: any = {
      responseType: 'text'
    };

    if (headers) {
      options.headers = headers;
    }

    const payload = isEmail
      ? { email: identifier, otp, "identifierType": "EMAIL" }
      : { phone: identifier, otp, "identifierType": "PHONE" };

    return this.http.post<string>(url, payload, options);
  }

  /**
   * Logout user and clear session
   */
  logout(redirectToLogin: boolean = true): void {
    console.log('[AuthService] Logging out user');

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.LOGIN_TIME_KEY);
    localStorage.removeItem(this.LAST_ACTIVITY_KEY);

    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);

    if (redirectToLogin) {
      this.router.navigate(['/home/login']);
    }
  }

  /**
   * Check if user is currently logged in
   */
  isLoggedIn(): boolean {
    return this.hasValidSession();
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    if (this.hasValidSession()) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    if (this.hasValidSession()) {
      return localStorage.getItem(this.USER_ID_KEY);
    }
    return null;
  }

  /**
   * Get current user session
   */
  getUserSession(): UserSession | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get session remaining time in milliseconds
   */
  getSessionRemainingTime(): number {
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);

    if (!lastActivity) {
      return 0;
    }

    const lastActivityTime = parseInt(lastActivity, 10);
    const currentTime = Date.now();
    const timeSinceLastActivity = currentTime - lastActivityTime;
    const remainingTime = this.SESSION_TIMEOUT - timeSinceLastActivity;

    return remainingTime > 0 ? remainingTime : 0;
  }

  /**
   * Check if session is about to expire (within 5 minutes)
   */
  isSessionExpiringSoon(): boolean {
    const remainingTime = this.getSessionRemainingTime();
    return remainingTime > 0 && remainingTime < 5 * 60 * 1000;
  }

  /**
   * Manually refresh session activity
   */
  refreshSession(): void {
    this.updateLastActivity();
  }
}
