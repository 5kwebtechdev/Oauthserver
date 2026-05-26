import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
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
    gender?: string;
    dateOfBirth?: string;
    relationship?: 'CHILD' | 'PARENT' | 'SELF';
    role?: string;
    referralCode?: string | null;
    family?: {
      id: number;
      familyCode: string;
      familyName: string;
    } | null;
    familyMembers?: Array<{
      id: number;
      userId: number;
      name: string;
      relationship: string;
      dateOfBirth: string;
    }>;
    avatar?: {
      id: number;
      avatarName: string;
      gender: string | null;
      url: string;
    } | null;
    pet?: {
      id: number;
      petName: string;
      gender: string | null;
      url: string;
    } | null;
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

  // Observable to track user data (profile info from login/refresh)
  // This is the primary source of truth for user profile data across the app
  private userDataSubject = new BehaviorSubject<any>(this.loadUserDataFromStorage());
  public userData$ = this.userDataSubject.asObservable();

  // Session timeout configuration
  // Sessions persist until manual logout for both web and mobile platforms
  private readonly SESSION_PERSIST_UNTIL_LOGOUT = Number.MAX_SAFE_INTEGER; // Persist indefinitely until manual logout
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
   * Returns the session timeout - sessions persist until manual logout
   */
  private getSessionTimeout(): number {
    return this.SESSION_PERSIST_UNTIL_LOGOUT;
  }

  /**
   * Initialize session monitoring - minimal checks since sessions persist until logout
   */
  private initSessionMonitoring(): void {
    console.log('Session monitoring initialized - sessions persist until manual logout');
    // Periodic validity check (optional, kept minimal)
    timer(this.TOKEN_REFRESH_INTERVAL, this.TOKEN_REFRESH_INTERVAL).subscribe(() => {
      this.checkSessionValidity();
    });
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
    const loginUrl = `${this.apiUrl}/auth/login`;
    console.log('[AuthService] Login attempt with:', {
      endpoint: loginUrl,
      credentials: { ...credentials, password: '***', rememberMe: credentials.rememberMe },
      timestamp: new Date().toISOString()
    });
    console.log('[AuthService] Full API URL:', loginUrl);
    console.log('[AuthService] Base API URL from environment:', this.apiUrl);

    return this.http.post<AuthResponse>(loginUrl, credentials)
      .pipe(
        tap({
          next: (response) => {
            const userId = response.user?.id;

            console.log('[AuthService] Login successful:', {
              userId,
              hasToken: !!response.token,
              userObject: response.user,
              timestamp: new Date().toISOString(),
            });

            if (response && response.token && userId) {
              this.setSession(
                {
                  token: response.token,
                  userId: userId,
                  expiresIn: response.expiresIn,
                  user: response.user
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
  setSession(authResponse: { token: string; userId: number; expiresIn?: number; user?: any }, rememberMe: boolean = false)
    : void {
    const currentTime = Date.now().toString();
    const platformType = this.isMobilePlatform ? 'mobile' : 'web';

    localStorage.setItem(this.TOKEN_KEY, authResponse.token);
    localStorage.setItem(this.USER_ID_KEY, authResponse.userId.toString());
    localStorage.setItem(this.LOGIN_TIME_KEY, currentTime);
    localStorage.setItem(this.LAST_ACTIVITY_KEY, currentTime);
    localStorage.setItem(this.PLATFORM_KEY, platformType);
    
    // Store full user data and notify all subscribers
    this.setUserData(authResponse.user);

    console.log('[AuthService] Session established:', {
      userId: authResponse.userId,
      loginTime: new Date(parseInt(currentTime)).toISOString(),
      platform: platformType,
      sessionBehavior: 'Persists until manual logout'
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

  checkEmailExists(email: string) {
    const url = `${this.apiUrl}/api/public/check-mail-already-exists`;
    return this.http.get<{ exists: boolean }>(url, { params: { email } });
  }

  requestOtp(email: string) {
    const headers = environment.apiAuthToken ? new HttpHeaders({
      Authorization: environment.apiAuthToken,
      'Content-Type': 'application/json'
    }) : undefined;

    const url = `${this.apiUrl}/auth/forgot-password`;

    const options: any = { responseType: 'text' };
    if (headers) options.headers = headers;

    return this.http.post<string>(url, { email }, options);
  }

  verifyOtp(email: string, otp: string) {
    const url = `${this.apiUrl}/auth/forgot-password/verify-otp`;

    const headers = environment.apiAuthToken ? new HttpHeaders({
      Authorization: environment.apiAuthToken,
      'Content-Type': 'application/json'
    }) : undefined;

    const options: any = { responseType: 'text' };
    if (headers) options.headers = headers;

    return this.http.post<string>(url, { email, otp }, options);
  }

  resetPassword(email: string, password: string) {
    const url = `${this.apiUrl}/auth/forgot-password/reset-password`;

    const headers = environment.apiAuthToken ? new HttpHeaders({
      Authorization: environment.apiAuthToken,
      'Content-Type': 'application/json'
    }) : undefined;

    const options: any = { responseType: 'text' };
    if (headers) options.headers = headers;

    return this.http.post<string>(url, { email, password }, options);
  }

  register(payload: any) {
    const url = `${this.apiUrl}/auth/register`;
    return this.http.post<any>(url, payload);
  }

  /**
   * Sign in / register with Google OAuth profile data.
   * Backend endpoint: POST /api/public/oauth2-login
   */
  googleOAuthLogin(profile: any): Observable<AuthResponse> {
    const url = `${this.apiUrl}/api/public/oauth2-login`;
    return this.http.post<AuthResponse>(url, profile);
  }

  completeGoogleOnboarding(payload: any): Observable<any> {
    const url = `${this.apiUrl}/api/auth/complete-google-profile`;
    return this.http.post<any>(url, payload);
  }

  sendLoginOtp(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/send-otp`, { email });
  }

  verifyLoginOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/verify-otp`, { email, otp });
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

    console.log('[AuthService] registerRequestOtp - Calling:', url);
    console.log('[AuthService] registerRequestOtp - Payload:', payload);
    console.log('[AuthService] registerRequestOtp - Has Auth Token:', !!headers);

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
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_stats');
    localStorage.removeItem('mindful_buddy_pet_data');
    localStorage.removeItem('platform');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('mb_selected_child_id');

    // Remove all date-keyed vibe_sets entries (e.g. vibe_sets_2026-05-12)
    Object.keys(localStorage)
      .filter(key => key.startsWith('vibe_sets_'))
      .forEach(key => localStorage.removeItem(key));

    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    this.userDataSubject.next(null);

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
      return this.SESSION_PERSIST_UNTIL_LOGOUT;
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
    timeout: number;
    remainingTime: number;
    expiresAt: Date | null;
  } {
    const session = this.getCurrentSession();
    const isActive = this.hasValidSession();
    const timeout = this.getSessionTimeout();
    const remainingTime = this.getSessionRemainingTime();

    return {
      isActive,
      platform: this.isMobilePlatform ? 'mobile' : 'web',
      timeout,
      remainingTime,
      expiresAt: null // Sessions persist indefinitely until logout
    };
  }

  /**
   * Get full user data from stored session (includes avatar, pet, family details, etc.)
   * Data is stored in localStorage and will be cleared on logout
   */
  getUserData(): any {
    return this.userDataSubject.value;
  }

  /**
   * Load user data from localStorage (used for initializing the BehaviorSubject)
   */
  private loadUserDataFromStorage(): any {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        return JSON.parse(userData);
      }
    } catch (error) {
      console.error('[AuthService] Error loading user data from storage:', error);
    }
    return null;
  }

  /**
   * Update user data in localStorage and notify all subscribers
   * Call this method whenever user profile is updated (e.g., from edit-profile)
   * @param data - Partial user data to merge with existing data
   */
  updateUserData(data: Partial<any>): void {
    try {
      const currentData = this.userDataSubject.value || {};
      const updatedData = { ...currentData, ...data };
      
      // Handle nested avatar object
      if (data['avatar']) {
        updatedData['avatar'] = { ...(currentData['avatar'] || {}), ...data['avatar'] };
      }
      
      // Save to localStorage
      localStorage.setItem('user_data', JSON.stringify(updatedData));
      
      // Notify all subscribers
      this.userDataSubject.next(updatedData);
      
      console.log('[AuthService] User data updated and broadcasted:', updatedData);
    } catch (error) {
      console.error('[AuthService] Error updating user data:', error);
    }
  }

  /**
   * Set complete user data (replaces all existing data)
   * Used during login to set the initial user data
   */
  setUserData(data: any): void {
    try {
      localStorage.setItem('user_data', JSON.stringify(data));
      this.userDataSubject.next(data);
      console.log('[AuthService] User data set and broadcasted');
    } catch (error) {
      console.error('[AuthService] Error setting user data:', error);
    }
  }

  /**
   * Get user's relationship from stored data
   */
  getUserRelationship(): 'CHILD' | 'PARENT' | 'SELF' | null {
    try {
      const userData = this.getUserData();
      if (userData) {
        return userData.relationship || null;
      }
    } catch (error) {
      console.error('[AuthService] Error getting user relationship:', error);
    }
    return null;
  }

  /**
   * Get the appropriate dashboard route based on user's relationship
   */
  getDashboardRoute(): string {
    const relationship = this.getUserRelationship();

    console.log('[AuthService] Determining dashboard route:', {
      relationship,
      timestamp: new Date().toISOString()
    });

    // Parent users go to parent-account page
    if (relationship === 'PARENT') {
      return '/authed/parent-account';
    }

    // Child and Self users go to user-dashboard
    return '/authed/user-dashboard';
  }

  /**
   * Get user's avatar data from stored session
   */
  getUserAvatar(): any {
    try {
      const userData = this.getUserData();
      if (userData && userData.avatar) {
        return userData.avatar;
      }
    } catch (error) {
      console.error('[AuthService] Error getting user avatar:', error);
    }
    return null;
  }

  /**
   * Get user's pet data from stored session
   */
  getUserPet(): any {
    try {
      const userData = this.getUserData();
      if (userData && userData.pet) {
        return userData.pet;
      }
    } catch (error) {
      console.error('[AuthService] Error getting user pet:', error);
    }
    return null;
  }

  /**
   * Check if the current user is a parent
   */
  isParentUser(): boolean {
    return this.getUserRelationship() === 'PARENT';
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

  /**
   * Check if a referral code is valid.
   * Endpoint: GET {{host}}/v1/auth/check-referral?referralCode=<code>
   */
  checkReferralCode(referralCode: string) {
    const url = `${this.apiUrl}/auth/check-referral`;
    const headers = new HttpHeaders({
      'X-Skip-Auth-Handler': 'true'
    });

    return this.http.get<any>(url, { 
      params: { referralCode },
      headers
    }).pipe(
      tap({
        next: (response) => {
          console.log('[AuthService] Referral code validated successfully:', {
            referralCode: referralCode,
            timestamp: new Date().toISOString(),
            response: response
          });
        },
        error: (error) => {
          console.error('[AuthService] Referral code validation failed:', {
            referralCode: referralCode,
            error: error.message,
            status: error.status,
            timestamp: new Date().toISOString()
          });
        }
      })
    );
  }

  /**
   * Refresh user data from the API and update local storage
   * This validates the session and fetches fresh user data
   * @returns Observable<boolean> - true if session is valid and data refreshed, false otherwise
   */
  refreshUserData(): Observable<boolean> {
    const token = this.getToken();
    const userId = this.getUserId();

    if (!token || !userId) {
      console.log('[AuthService] No valid session to refresh');
      return of(false);
    }

    console.log('[AuthService] Refreshing user data from API...');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Fetch user profile from API
    return this.http.get<any>(`${this.apiUrl}/users/${userId}/profile`, { headers }).pipe(
      tap({
        next: (userData) => {
          console.log('[AuthService] User data refreshed successfully:', {
            userId: userData?.id || userId,
            hasData: !!userData,
            timestamp: new Date().toISOString()
          });

          if (userData) {
            // Update user_data using the new method (updates localStorage and notifies subscribers)
            const existingData = this.getUserData() || {};
            const updatedData = {
              ...existingData,
              ...userData,
              id: userData.id || existingData.id || parseInt(userId, 10)
            };
            this.setUserData(updatedData);

            // Update last activity to keep session fresh
            this.updateLastActivity();
          }
        },
        error: (error) => {
          console.error('[AuthService] Failed to refresh user data:', {
            error: error.message,
            status: error.status,
            timestamp: new Date().toISOString()
          });

          // If unauthorized (401), session is invalid - logout
          if (error.status === 401) {
            console.log('[AuthService] Session invalid, logging out...');
            this.logout();
          }
        }
      }),
      map(() => true),
      catchError((error) => {
        // Return false but don't throw - let the app continue
        if (error.status !== 401) {
          return of(false);
        }
        return of(false);
      })
    );
  }

  /**
   * Check if session is valid by making a lightweight API call
   * @returns Observable<boolean> - true if session is valid
   */
  validateSession(): Observable<boolean> {
    const token = this.getToken();

    if (!token) {
      return of(false);
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Use a lightweight endpoint to validate token
    return this.http.get<any>(`${this.apiUrl}/auth/validate`, { headers }).pipe(
      map(() => true),
      catchError((error) => {
        console.log('[AuthService] Session validation failed:', error.status);
        if (error.status === 401) {
          this.logout();
        }
        return of(false);
      })
    );
  }
}
