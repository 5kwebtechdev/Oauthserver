import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
  rememberMe?: boolean; // Optional remember me flag
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    family?: any;
    familyMembers?: any[];
    avatar?: string | null;
    pet?: string | null;
  };
  expiresIn?: number;
}

export interface ReferralCodeResponse {
  referralCode: string;
}

export interface UserSession {
  userId: number;
  token: string;
  loginTime: number;
  lastActivity: number;
  rememberMe: boolean;
  platform: 'web' | 'mobile';
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

  // Session timeout configuration
  private readonly WEB_SESSION_TIMEOUT = 2 * 60 * 1000; // 2 minutes for web testing (change to 30 * 60 * 1000 for production)
  private readonly MOBILE_SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days for mobile
  private readonly REMEMBER_ME_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days when "Remember Me" is checked
  private readonly TOKEN_REFRESH_INTERVAL = 30 * 1000; // Check every 30 seconds for testing (change to 5 * 60 * 1000 for production)

  // Storage keys
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_ID_KEY = 'user_id';
  private readonly LOGIN_TIME_KEY = 'login_time';
  private readonly LAST_ACTIVITY_KEY = 'last_activity';
  private readonly REMEMBER_ME_KEY = 'remember_me';
  private readonly PLATFORM_KEY = 'platform';

  private isMobilePlatform: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private platform: Platform
  ) {
    this.detectPlatform();
    this.initSessionMonitoring();
  }

  /**
   * Detects the current platform (mobile or web)
   */
  private detectPlatform(): void {
    this.isMobilePlatform = this.platform.is('cordova') ||
      this.platform.is('capacitor') ||
      this.platform.is('android') ||
      this.platform.is('ios');
    console.log('Platform detected:', this.isMobilePlatform ? 'Mobile' : 'Web');
  }

  /**
   * Returns the appropriate session timeout based on platform and remember me setting
   */
  private getSessionTimeout(): number {
    const rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';

    if (this.isMobilePlatform) {
      return this.MOBILE_SESSION_TIMEOUT;
    }

    return rememberMe ? this.REMEMBER_ME_TIMEOUT : this.WEB_SESSION_TIMEOUT;
  }

  /**
   * Initialize session monitoring to track user activity and session expiration
   */
  private initSessionMonitoring(): void {
    // On mobile platforms, skip periodic checks and activity tracking to save battery
    if (this.isMobilePlatform) {
      console.log('Mobile platform detected - session persists until logout');
      return;
    }

    // Check session validity periodically (web only)
    timer(0, this.TOKEN_REFRESH_INTERVAL).subscribe(() => {
      this.checkSessionValidity();
    });

    // Track user activity (web only)
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

    // On mobile platforms, session is valid as long as token exists
    if (this.isMobilePlatform) {
      return true;
    }

    const lastActivityTime = parseInt(lastActivity, 10);
    const currentTime = Date.now();
    const timeSinceLastActivity = currentTime - lastActivityTime;

    return timeSinceLastActivity < this.getSessionTimeout();
  }

  /**
   * Get current session from localStorage
   */
  private getCurrentSession(): UserSession | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userId = localStorage.getItem(this.USER_ID_KEY);
    const loginTime = localStorage.getItem(this.LOGIN_TIME_KEY);
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    const rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
    const platform = (localStorage.getItem(this.PLATFORM_KEY) || 'web') as 'web' | 'mobile';

    if (!token || !userId) {
      return null;
    }

    return {
      userId: parseInt(userId, 10),
      token,
      loginTime: parseInt(loginTime || '0', 10),
      lastActivity: parseInt(lastActivity || '0', 10),
      rememberMe,
      platform
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
      credentials: { ...credentials, password: '***', rememberMe: credentials.rememberMe },
      timestamp: new Date().toISOString()
    });

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap({
          next: (response) => {
            const userId = response.user?.id;

            console.log('[AuthService] Login successful:', {
              userId,
              hasToken: !!response.token,
              timestamp: new Date().toISOString(),
            });

            if (response && response.token && userId) {
              this.setSession(
                {
                  token: response.token,
                  userId: userId,
                  expiresIn: response.expiresIn,
                },
                credentials.rememberMe || false
              );
            } else {
              console.error('[AuthService] Invalid login response structure:', response);
            }
          },
        })

      );
  }

  /**
   * Set user session after successful login
   */
  private setSession(authResponse: { token: string; userId: number; expiresIn?: number; user?: any }, rememberMe: boolean = false)
    : void {
    const currentTime = Date.now().toString();
    const platformType = this.isMobilePlatform ? 'mobile' : 'web';

    localStorage.setItem(this.TOKEN_KEY, authResponse.token);
    localStorage.setItem(this.USER_ID_KEY, authResponse.userId.toString());
    localStorage.setItem(this.LOGIN_TIME_KEY, currentTime);
    localStorage.setItem(this.LAST_ACTIVITY_KEY, currentTime);
    localStorage.setItem(this.REMEMBER_ME_KEY, rememberMe.toString());
    localStorage.setItem(this.PLATFORM_KEY, platformType);
    localStorage.setItem('user_data', JSON.stringify(authResponse.user));


    console.log('[AuthService] Session established:', {
      userId: authResponse.userId,
      loginTime: new Date(parseInt(currentTime)).toISOString(),
      platform: platformType,
      rememberMe: rememberMe,
      sessionTimeout: this.isMobilePlatform ? 'No timeout (mobile)' :
        rememberMe ? '30 days' : '2 minutes (testing)'
    });

    // Update observables
    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next({
      userId: authResponse.userId,
      token: authResponse.token,
      loginTime: parseInt(currentTime, 10),
      lastActivity: parseInt(currentTime, 10),
      rememberMe: rememberMe,
      platform: platformType
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
   * Get remaining time for the current session (in milliseconds)
   */
  getSessionRemainingTime(): number {
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);

    if (!lastActivity) {
      return 0;
    }

    // On mobile, return max timeout value as there's no automatic expiration
    if (this.isMobilePlatform) {
      return this.MOBILE_SESSION_TIMEOUT;
    }

    const lastActivityTime = parseInt(lastActivity, 10);
    const currentTime = Date.now();
    const timeSinceLastActivity = currentTime - lastActivityTime;
    const remainingTime = this.getSessionTimeout() - timeSinceLastActivity;

    return remainingTime > 0 ? remainingTime : 0;
  }

  /**
   * Check if session is about to expire (within 5 minutes)
   */
  isSessionExpiringSoon(): boolean {
    // On mobile, sessions don't expire
    if (this.isMobilePlatform) {
      return false;
    }

    const remainingTime = this.getSessionRemainingTime();
    return remainingTime > 0 && remainingTime < 5 * 60 * 1000;
  }

  /**
   * Manually refresh session activity
   */
  refreshSession(): void {
    this.updateLastActivity();
  }

  /**
   * Check if running on mobile platform
   */
  isMobile(): boolean {
    return this.isMobilePlatform;
  }

  /**
   * Get detailed session information
   */
  getSessionInfo(): {
    isActive: boolean;
    platform: 'web' | 'mobile';
    rememberMe: boolean;
    timeout: number;
    remainingTime: number;
    expiresAt: Date | null;
  } {
    const session = this.getCurrentSession();
    const isActive = this.hasValidSession();
    const timeout = this.getSessionTimeout();
    const remainingTime = this.getSessionRemainingTime();

    let expiresAt: Date | null = null;
    if (isActive && !this.isMobilePlatform && session) {
      expiresAt = new Date(session.lastActivity + timeout);
    }

    return {
      isActive,
      platform: this.isMobilePlatform ? 'mobile' : 'web',
      rememberMe: session?.rememberMe || false,
      timeout,
      remainingTime,
      expiresAt
    };
  }

  /**
   * Generate referral code for the authenticated user
   */
  generateReferralCode(): Observable<ReferralCodeResponse> {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('User not authenticated');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const url = `${this.apiUrl}/auth/users/generate-referral`;

    console.log('[AuthService] Generating referral code:', {
      endpoint: url,
      timestamp: new Date().toISOString()
    });

    return this.http.post<ReferralCodeResponse>(url, {}, { headers })
      .pipe(
        tap({
          next: (response) => {
            console.log('[AuthService] Referral code generated successfully:', {
              hasReferralCode: !!response.referralCode,
              timestamp: new Date().toISOString()
            });
          },
          error: (error) => {
            console.error('[AuthService] Failed to generate referral code:', {
              error: error.message,
              status: error.status,
              timestamp: new Date().toISOString()
            });
          }
        })
      );
  }
}
