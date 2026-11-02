import { Injectable, Inject, forwardRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ParentDataService } from './parent-data.service';

// ========== INTERFACES ==========

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  relationship: 'CHILD' | 'PARENT' | 'SELF';
  avatarName?: string;
  petName?: string;
  familyCode?: string;
}

export interface Avatar {
  id: number;
  avatarName: string;
  gender: string | null;
  url: string;
}

export interface Pet {
  id: number;
  petName: string;
  gender: string | null;
  url: string;
}

export interface Family {
  id: number;
  familyCode: string;
  familyName: string;
}

export interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  relationship?: 'CHILD' | 'PARENT' | 'SELF';
  role?: string;
  referralCode?: string | null;
  family?: Family | null;
  avatar?: Avatar | null;
  pet?: Pet | null;
  coins?: number;
  currentStreak?: number;
  highestStreak?: number;
  age?: number;
  ageGroup?: string;
}

export interface AuthResponse {
  token: string;
  userId?: number;
  user?: User;
  expiresIn?: number;
}

export interface EditProfilePayload {
  avatarName?: string;
  avatarImageName?: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
  email?: string;
}

export interface EditProfileResponse extends User {
  loggedIn: boolean;
  usingEmail: boolean;
  usingPhone: boolean;
}

export interface FamilyMember {
  userId: number;
  name: string;
  avatarName: string;
  relationship: string;
  age: number;
  you: boolean;
}

export interface FamilyInfo {
  familyId: number;
  familyName: string;
  status: string;
  createdOn: string;
  creator: FamilyMember;
  members: FamilyMember[];
}

export interface FamilyDetailsResponse {
  mode: string;
  family: FamilyInfo | null;
  selfMode: any | null;
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
}

// ========== SERVICE ==========

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
  private readonly WEB_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly REMEMBER_ME_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Storage keys
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_ID_KEY = 'user_id';
  private readonly LOGIN_TIME_KEY = 'login_time';
  private readonly LAST_ACTIVITY_KEY = 'last_activity';
  private readonly REMEMBER_ME_KEY = 'remember_me';
  private readonly USER_DATA_KEY = 'user_data';

  constructor(
    private http: HttpClient,
    private router: Router,
    private parentDataService: ParentDataService
  ) {
    this.initSessionMonitoring();
  }

  // ========== SESSION MANAGEMENT ==========

  private getSessionTimeout(): number {
    const rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
    return rememberMe ? this.REMEMBER_ME_TIMEOUT : this.WEB_SESSION_TIMEOUT;
  }

  private initSessionMonitoring(): void {
    if (typeof window === 'undefined') return;
    timer(0, this.TOKEN_REFRESH_INTERVAL).subscribe(() => {
      this.checkSessionValidity();
    });

    if (typeof window !== 'undefined') {
      ['click', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => this.updateLastActivity(), { passive: true });
      });
    }
  }

  private hasValidSession(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const token = localStorage.getItem(this.TOKEN_KEY);
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);

    if (!token || !lastActivity) return false;

    const lastActivityTime = parseInt(lastActivity, 10);
    const timeSinceLastActivity = Date.now() - lastActivityTime;

    return timeSinceLastActivity < this.getSessionTimeout();
  }

  private getCurrentSession(): UserSession | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userId = localStorage.getItem(this.USER_ID_KEY);
    const loginTime = localStorage.getItem(this.LOGIN_TIME_KEY);
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    const rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';

    if (!token || !userId) return null;

    return {
      userId: parseInt(userId, 10),
      token,
      loginTime: parseInt(loginTime || '0', 10),
      lastActivity: parseInt(lastActivity || '0', 10),
      rememberMe
    };
  }

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

  private updateLastActivity(): void {
    if (this.isLoggedIn()) {
      localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }

  private setSession(authResponse: { token: string; userId: number; user?: User }, rememberMe: boolean = false): void {
    const currentTime = Date.now().toString();

    localStorage.setItem(this.TOKEN_KEY, authResponse.token);
    localStorage.setItem(this.USER_ID_KEY, authResponse.userId.toString());
    localStorage.setItem(this.LOGIN_TIME_KEY, currentTime);
    localStorage.setItem(this.LAST_ACTIVITY_KEY, currentTime);
    localStorage.setItem(this.REMEMBER_ME_KEY, rememberMe.toString());

    if (authResponse.user) {
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(authResponse.user));
    }

    console.log('[AuthService] Session established:', {
      userId: authResponse.userId,
      rememberMe,
      sessionTimeout: rememberMe ? '30 days' : '30 minutes'
    });

    this.isAuthenticatedSubject.next(true);
    this.currentUserSubject.next({
      userId: authResponse.userId,
      token: authResponse.token,
      loginTime: parseInt(currentTime, 10),
      lastActivity: parseInt(currentTime, 10),
      rememberMe
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (token) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });
    }

    if (environment.apiAuthToken) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': environment.apiAuthToken
      });
    }

    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  // ========== AUTHENTICATION API ==========

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const url = `${this.apiUrl}/auth/login`;

    console.log('[AuthService] Login attempt:', {
      endpoint: url,
      hasEmail: !!credentials.email,
      hasPhone: !!credentials.phone,
      rememberMe: credentials.rememberMe
    });

    return this.http.post<AuthResponse>(url, credentials).pipe(
      tap({
        next: (response: any) => {
          const userId = response.user?.id || response.userId || response.admin?.id;
          console.log('[AuthService] Login successful:', { userId, hasToken: !!response.token });

          if (response.token && userId) {
            // Normalise admin-shaped response into a User object
            const user: User = response.user ?? (response.admin ? {
              id: response.admin.id,
              name: response.admin.fullName || response.admin.name || '',
              email: response.admin.email,
              phone: response.admin.phone,
              role: response.admin.role,
            } : undefined);

            this.setSession(
              { token: response.token, userId, user },
              credentials.rememberMe || false
            );
          }
        },
        error: (error) => {
          console.error('[AuthService] Login failed:', error.status, error.message);
        }
      })
    );
  }

  register(payload: RegisterPayload | any): Observable<AuthResponse> {
    const url = `${this.apiUrl}/auth/register`;

    console.log('[AuthService] Register attempt:', {
      endpoint: url,
      name: payload.name,
      relationship: payload.relationship
    });

    return this.http.post<AuthResponse>(url, payload).pipe(
      tap({
        next: (response) => {
          console.log('[AuthService] Registration successful:', { hasToken: !!response.token });
        },
        error: (error) => {
          console.error('[AuthService] Registration failed:', error.status, error.message);
        }
      })
    );
  }

  checkEmailExists(email: string): Observable<any> {
    const url = `${this.apiUrl}/api/public/check-mail-already-exists`;
    const headers = this.getAuthHeaders();
    return this.http.get(url, { headers, params: { email } });
  }

  oauth2Login(payload: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
    gender?: string;
    dob?: string;
    avatarImageName?: string;
    petName?: string;
  }): Observable<any> {
    const url = `${this.apiUrl}/api/public/oauth2-login`;
    const headers = this.getAuthHeaders();
    return this.http.post(url, payload, { headers }).pipe(
      tap((response: any) => {
        const token = response.token || response.data?.token;
        const userId = response.user?.id || response.admin?.id || response.data?.user?.id || response.userId;
        if (token && userId) {
          this.setSession({ token, userId }, false);
        }
      })
    );
  }

  registerRequestOtp(email: string): Observable<any> {
    const url = `${this.apiUrl}/api/auth/send-otp`;
    const headers = this.getAuthHeaders();
    return this.http.post(url, { email }, { headers });
  }

  registerVerifyOtp(email: string, otp: string): Observable<any> {
    const url = `${this.apiUrl}/api/auth/verify-otp`;
    const headers = this.getAuthHeaders();
    return this.http.post(url, { email, otp }, { headers });
  }

  requestOtp(email: string): Observable<any> {
    const url = `${this.apiUrl}/auth/forgot-password`;
    const headers = this.getAuthHeaders();

    return this.http.post(url, { email }, { headers });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    const url = `${this.apiUrl}/auth/forgot-password/verify-otp`;
    const headers = this.getAuthHeaders();

    return this.http.post(url, { email, otp }, { headers });
  }

  resetPassword(email: string, password: string): Observable<any> {
    const url = `${this.apiUrl}/auth/forgot-password/reset-password`;
    const headers = this.getAuthHeaders();

    return this.http.post(url, { email, password }, { headers });
  }

  changePassword(currentPassword: string, newPassword: string, retypeNewPassword: string): Observable<any> {
    const url = `${this.apiUrl}/auth/change-password`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });
    return this.http.put(url, { currentPassword, newPassword, retypeNewPassword }, { headers });
  }

  editProfile(payload: EditProfilePayload): Observable<EditProfileResponse> {
    const url = `${this.apiUrl}/auth/edit-profile`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });

    return this.http.put<EditProfileResponse>(url, payload, { headers });
  }

  getFamilyDetails(): Observable<FamilyDetailsResponse> {
    const url = `${this.apiUrl}/auth/family-details`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });

    return this.http.get<FamilyDetailsResponse>(url, { headers });
  }

  generateReferralCode(): Observable<ReferralCodeResponse> {
    const url = `${this.apiUrl}/auth/users/generate-referral`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });

    return this.http.post<ReferralCodeResponse>(url, {}, { headers });
  }

  /**
   * Check if a referral code is valid.
   * Endpoint: GET {{host}}/auth/check-referral?referralCode=<code>
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
          console.log('[AuthService] Referral code validated successfully:', { referralCode, response });
        },
        error: (error) => {
          console.error('[AuthService] Referral code validation failed:', { referralCode, error });
        }
      })
    );
  }

  // ========== SESSION HELPERS ==========

  logout(redirectToLogin: boolean = true): void {
    console.log('[AuthService] Logging out user');

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.LOGIN_TIME_KEY);
    localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    localStorage.removeItem(this.REMEMBER_ME_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
    localStorage.removeItem('user_profile');

    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    this.parentDataService.clear();

    if (redirectToLogin) {
      this.router.navigate(['/'], { replaceUrl: true });
    }
  }

  isLoggedIn(): boolean {
    return this.hasValidSession();
  }

  getToken(): string | null {
    if (this.hasValidSession()) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  getUserId(): string | null {
    if (this.hasValidSession()) {
      return localStorage.getItem(this.USER_ID_KEY);
    }
    return null;
  }

  getUserData(): User | null {
    try {
      const userData = localStorage.getItem(this.USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  getUserRelationship(): 'CHILD' | 'PARENT' | 'SELF' | null {
    const userData = this.getUserData();
    return userData?.relationship || null;
  }

  getDashboardRoute(): string {
    const relationship = this.getUserRelationship();

    switch (relationship) {
      case 'PARENT':
        return '/parent';
      case 'CHILD':
      case 'SELF':
      default:
        return '/home';
    }
  }

  isParentUser(): boolean {
    return this.getUserRelationship() === 'PARENT';
  }

  getSessionRemainingTime(): number {
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
    if (!lastActivity) return 0;

    const lastActivityTime = parseInt(lastActivity, 10);
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    const remainingTime = this.getSessionTimeout() - timeSinceLastActivity;

    return remainingTime > 0 ? remainingTime : 0;
  }

  isSessionExpiringSoon(): boolean {
    const remainingTime = this.getSessionRemainingTime();
    return remainingTime > 0 && remainingTime < 5 * 60 * 1000;
  }

  refreshSession(): void {
    this.updateLastActivity();
  }
}
