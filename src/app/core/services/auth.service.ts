import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, timer, of, firstValueFrom } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavController, Platform } from '@ionic/angular';
import { MoodService } from './mood.service';
import { AnalyticsService } from './analytics.service';
import { AuthSessionCleanupService } from './auth-session-cleanup.service';
import { CrashlyticsService } from './crashlytics.service';
import { PushNotificationService } from './push-notification.service';
import { PetAgeService } from './pet-age.service';
import { toApiGender } from '../models/gender.model';
import {
  OnboardingStateService,
  RegistrationDraftData,
  OnboardingResumeNavigation
} from './onboarding-state.service';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
  rememberMe?: boolean; // Optional remember me flag
}

export interface AuthResponse { 
  token: string;
  firstLoggedForTheDay?: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    age?: number;
    gender?: string;
    dateOfBirth?: string | number;
    dob?: string | number;
    birthDate?: string | number;
    relationship?: 'CHILD' | 'PARENT' | 'SELF';
    asChild?: boolean;
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
    onboardingStep?: number;
    emailVerified?: boolean;
  };
  expiresIn?: number;
}

export interface RegistrationOtpResponse {
  success?: boolean;
  message?: string;
  nextStep?: number;
  savedData?: RegistrationDraftData;
}

export interface ReferralCodeResponse {
  referralCode: string;
}

export interface ShareLoginCredentialsPayload {
  email: string;
  password: string;
  message: string;
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

  // Emits after the backend confirms a family member was removed, allowing
  // cached profile/dashboard pages to drop the member immediately.
  private familyMemberRemovedSubject = new Subject<string>();
  public familyMemberRemoved$ = this.familyMemberRemovedSubject.asObservable();
  // A family details read can lag behind a successful removal for a short
  // time. Keep the confirmed removals in memory so a stale response cannot
  // put that member back into Profile/Home during the same session.
  private readonly removedFamilyMemberIds = new Set<string>();
  private readonly REMOVED_FAMILY_MEMBERS_KEY = 'superme_removed_family_member_ids';
  private familyChildCreatedSubject = new Subject<any>();
  public familyChildCreated$ = this.familyChildCreatedSubject.asObservable();

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
  private readonly FIRST_LOGGED_FOR_DAY_KEY = 'superme_first_logged_for_the_day';
  // In-memory only. Used solely for Parent Home → Add Child → Parent Home,
  // where an unrelated request must not turn a successful child creation
  // into an unexpected login redirect.
  private managedChildParentSession: { token: string; userId: number; user: any } | null = null;

  private isMobilePlatform: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private navCtrl: NavController,
    private platform: Platform,
    private moodService: MoodService,
    private analytics: AnalyticsService,
    private authSessionCleanup: AuthSessionCleanupService,
    private crashlytics: CrashlyticsService,
    private pushNotifications: PushNotificationService,
    private petAgeService: PetAgeService,
    private onboardingState: OnboardingStateService
  ) {
    this.detectPlatform();
    this.initSessionMonitoring();
    this.syncPetFromUserData(this.userDataSubject.value);
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
    const userId = localStorage.getItem(this.USER_ID_KEY);
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);

    if (!token || !userId || !lastActivity) {
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
              this.setFirstLoggedForTheDay(response.firstLoggedForTheDay === true, userId);
              this.analytics.logLogin(credentials.email ? 'email' : 'phone');
              this.analytics.setUserId(String(userId));
            } else {
              console.error('[AuthService] Invalid login response structure:', response);
            }
          },
        })

      );
  }

  /** Whether the login API confirmed this is the user's first login today. */
  isFirstLoggedForTheDay(): boolean {
    try {
      return sessionStorage.getItem(this.FIRST_LOGGED_FOR_DAY_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private setFirstLoggedForTheDay(value: boolean, userId: number): void {
    try {
      sessionStorage.setItem(this.FIRST_LOGGED_FOR_DAY_KEY, String(value));

      // The backend is authoritative. If it reports the first login, discard
      // a stale client-side seen marker so today's celebration can appear.
      if (value) {
        localStorage.removeItem(`superme_daily_streak_seen_${userId}`);
      }
    } catch {
      // Storage restrictions should safely result in no automatic popup.
    }
  }

  /**
   * Set user session after successful login
   */
  setSession(authResponse: { token: string; userId: number; expiresIn?: number; user?: any }, rememberMe: boolean = false)
    : void {
    const previousUserId = localStorage.getItem(this.USER_ID_KEY);
    if (previousUserId && previousUserId !== String(authResponse.userId)) {
      // Defensive account-switch boundary: even if a caller reached login
      // without completing logout, no previous user's state may survive.
      this.clearLocalUserState();
    }

    const currentTime = Date.now().toString();
    const platformType = this.isMobilePlatform ? 'mobile' : 'web';

    localStorage.setItem(this.TOKEN_KEY, authResponse.token);
    localStorage.setItem(this.USER_ID_KEY, authResponse.userId.toString());
    localStorage.setItem(this.LOGIN_TIME_KEY, currentTime);
    localStorage.setItem(this.LAST_ACTIVITY_KEY, currentTime);
    localStorage.setItem(this.PLATFORM_KEY, platformType);
    
    // Store full user data and notify all subscribers
    this.setUserData(authResponse.user);
    const onboardingStep = this.onboardingState.getOnboardingStep(authResponse.user);
    if (this.onboardingState.isOnboardingIncomplete(authResponse.user)) {
      this.onboardingState.saveRegistrationDraft(authResponse.user, onboardingStep);
    } else if (this.onboardingState.isOnboardingComplete(authResponse.user)) {
      this.onboardingState.clearRegistrationDraft();
    } else {
      // Older completed-user responses may omit onboardingStep entirely.
      // Do not let an unrelated unauthenticated draft override that login.
      this.onboardingState.clearRegistrationDraft();
    }
    this.crashlytics.setUserId(authResponse.userId);

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

    // Register the FCM token with the backend now that an auth token is available.
    this.pushNotifications.onAuthenticated().catch(err =>
      console.warn('[AuthService] FCM token sync failed:', err)
    );
  }

  /** Preserve the authenticated parent while they create a child on this device. */
  beginManagedChildParentSession(): boolean {
    // Read the raw values as a fallback: a recently-created parent can enter
    // family setup before the normal activity timestamp has been refreshed.
    const currentSession = this.getUserSession();
    const token = this.getToken()
      || currentSession?.token
      || localStorage.getItem(this.TOKEN_KEY);
    const userId = Number(
      this.getUserId()
      || currentSession?.userId
      || localStorage.getItem(this.USER_ID_KEY)
    );
    const storedUser = this.getUserData() || this.loadUserDataFromStorage();
    if (!token || !Number.isSafeInteger(userId) || userId <= 0) {
      return false;
    }

    // This method is invoked only from the Parent's Add Child action. Some
    // older family responses omit `relationship`, so preserve a parent role
    // for the guard instead of rejecting a valid authenticated parent.
    const user = {
      ...(storedUser || {}),
      id: storedUser?.id ?? userId,
      relationship: storedUser?.relationship || 'PARENT'
    };
    this.managedChildParentSession = { token, userId, user };
    return true;
  }

  /** Restore only the parent who started the current managed-child flow. */
  restoreManagedChildParentSession(): boolean {
    const session = this.managedChildParentSession;
    if (!session) return this.isParentUser();
    if (!this.isParentUser()) this.setSession(session, false);
    return this.isParentUser();
  }

  clearManagedChildParentSession(): void {
    this.managedChildParentSession = null;
  }

  /**
   * Replace only the active JWT after a role conversion or parent-child view switch.
   * User profile data is updated separately by the calling screen.
   */
  replaceAuthToken(token: string): void {
    if (!token) return;

    localStorage.setItem(this.TOKEN_KEY, token);
    this.updateLastActivity();

    const currentSession = this.currentUserSubject.value;
    if (currentSession) {
      this.currentUserSubject.next({
        ...currentSession,
        token,
        lastActivity: Date.now()
      });
    }
  }

  /**
   * Persist the pet chosen during authenticated child onboarding.
   */
  updatePetSelection(petName: string): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token?.startsWith('Bearer ') ? token : `Bearer ${token || ''}`
    });

    return this.http.put<any>(
      `${this.apiUrl}/user/profile`,
      { petName },
      { headers, responseType: 'text' as 'json' }
    ).pipe(
      tap(() => {
        const currentPet = this.getUserPet();
        const pet = typeof currentPet === 'object' && currentPet !== null
          ? { ...currentPet, petName }
          : { petName };
        // Keep both API shapes in sync. Some screens read `user.pet`, while
        // others still read the top-level `petName` returned during login.
        // Leaving the latter stale made the newly selected pet appear only
        // after the next login/profile refresh.
        this.updateUserData({ pet, petName });
      })
    );
  }

  checkEmailExists(email: string) {
    const url = `${this.apiUrl}/api/public/check-mail-already-exists`;
    return this.http.get<{ exists: boolean }>(url, { params: { email } });
  }

  checkUsernameExists(username: string): Observable<boolean> {
    const url = `${this.apiUrl}/auth/check/alreadyRegistered`;
    return this.http.get<{ status?: boolean; exists?: boolean }>(url, {
      params: { identifier: username }
    }).pipe(
      map(response => Boolean(response?.status ?? response?.exists ?? false))
    );
  }

  requestOtp(email: string) {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Skip-Loading': 'true'
    });
    if (environment.apiAuthToken) {
      headers = headers.set('Authorization', environment.apiAuthToken);
    }

    const url = `${this.apiUrl}/auth/forgot-password`;

    const options: any = { responseType: 'text', headers };

    return this.http.post<string>(url, { email }, options);
  }

  verifyOtp(email: string, otp: string) {
    const url = `${this.apiUrl}/auth/forgot-password/verify-otp`;

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Skip-Loading': 'true'
    });
    if (environment.apiAuthToken) {
      headers = headers.set('Authorization', environment.apiAuthToken);
    }

    const options: any = { responseType: 'text', headers };

    return this.http.post<string>(url, { email, otp }, options);
  }

  resetPassword(email: string, password: string) {
    const url = `${this.apiUrl}/auth/forgot-password/reset-password`;

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Skip-Loading': 'true'
    });
    if (environment.apiAuthToken) {
      headers = headers.set('Authorization', environment.apiAuthToken);
    }

    const options: any = { responseType: 'text', headers };

    return this.http.post<string>(url, { email, password }, options);
  }

  register(payload: any) {
    const url = `${this.apiUrl}/auth/register`;
    const requestPayload = { ...payload, gender: toApiGender(payload?.gender) };
    return this.http.post<any>(url, requestPayload).pipe(
      tap(() => this.analytics.logSignUp(payload.email ? 'email' : 'phone'))
    );
  }

  /**
   * Create a Child account while preserving the signed-in Parent session.
   * Loading is controlled by the managed-child wizard so registration and
   * credential sharing appear as one uninterrupted action.
   */
  registerManagedChild(payload: any): Observable<any> {
    const url = `${this.apiUrl}/auth/register`;
    const requestPayload = { ...payload };
    if (Object.prototype.hasOwnProperty.call(requestPayload, 'gender')) {
      requestPayload.gender = toApiGender(requestPayload.gender);
    }
    // This request is made by the authenticated parent. It must not inherit
    // a selected child's `forUserId`, and a registration-specific error must
    // never log the parent out of the app.
    const headers = new HttpHeaders({
      'X-Skip-Loading': 'true',
      'X-Skip-Auth-Handler': 'true',
      'X-Skip-Profile-Selector': 'true'
    });

    return this.http.post<any>(url, requestPayload, { headers }).pipe(
      tap(() => this.analytics.logSignUp(payload.email ? 'email' : 'phone'))
    );
  }

  /**
   * Email the credentials for an account created by a signed-in Parent.
   * Backend endpoint: POST /v1/auth/parent/share-login-credentials
   */
  shareLoginCredentials(payload: ShareLoginCredentialsPayload): Observable<string> {
    const url = `${this.apiUrl}/auth/parent/share-login-credentials`;
    // Credential delivery belongs to the signed-in parent, not the selected
    // child profile. Keep a recoverable endpoint error from ending the parent
    // session while the managed-child flow is completing.
    const headers = new HttpHeaders({
      'X-Skip-Loading': 'true',
      'X-Skip-Auth-Handler': 'true',
      'X-Skip-Profile-Selector': 'true'
    });
    return this.http.post(url, payload, { headers, responseType: 'text' });
  }

  /**
   * Sign in or create an account with a mobile OAuth profile.
   * Backend endpoint: POST /v1/auth/oauth2/mobile-login
   */
  googleOAuthLogin(profile: any): Observable<AuthResponse> {
    const url = `${this.apiUrl}/auth/oauth2/mobile-login`;
    const requestProfile = { ...profile };
    if (Object.prototype.hasOwnProperty.call(requestProfile, 'gender')) {
      requestProfile.gender = toApiGender(requestProfile.gender);
    }
    // OAuth login is an account-level, public authentication exchange. Do not
    // let a previously selected child add `forUserId`, or let a stale session
    // token be attached while logging in again from the web view.
    const headers = new HttpHeaders({
      'X-Skip-Authorization': 'true',
      'X-Skip-Profile-Selector': 'true'
    });
    return this.http.post<AuthResponse>(url, requestProfile, { headers });
  }

  completeGoogleOnboarding(payload: any): Observable<any> {
    const url = `${this.apiUrl}/api/auth/complete-google-profile`;
    return this.http.post<any>(url, payload);
  }

  sendLoginOtp(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/send-otp`, { email });
  }

  /**
   * POST /api/auth/send-otp — used for resending an OTP during signup.
   * Same endpoint and payload shape as registerRequestOtp()'s initial call.
   * Supports both email and phone identifiers.
   */
  resendRegisterOtp(identifier: string, isEmail: boolean, countryCode?: string): Observable<any> {
    const payload = isEmail
      ? { email: identifier, identifierType: 'EMAIL' }
      : { phone: identifier, identifierType: 'PHONE', countryCode };

    return this.http.post(`${this.apiUrl}/api/auth/send-otp`, payload);
  }

  verifyLoginOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/verify-otp`, { email, otp });
  }

  registerRequestOtp(identifier: string, isEmail: boolean, countryCode?: string) {
    const headers = environment.apiAuthToken ? new HttpHeaders({
      Authorization: environment.apiAuthToken,
      'Content-Type': 'application/json'
    }) : undefined;

    const url = `${this.apiUrl}/api/auth/send-otp`;

    const options: any = {};

    if (headers) {
      options.headers = headers;
    }

    const payload = isEmail
      ? { email: identifier, identifierType: 'EMAIL' }
      : { phone: identifier, identifierType: 'PHONE', countryCode };

    console.log('[AuthService] registerRequestOtp - Calling:', url);
    console.log('[AuthService] registerRequestOtp - Payload:', payload);
    console.log('[AuthService] registerRequestOtp - Has Auth Token:', !!headers);

    return this.http.post(url, payload, options).pipe(
      map(response => this.parseRegistrationResponse(response))
    );
  }

  registerVerifyOtp(
    identifier: string,
    otp: string,
    isEmail: boolean,
    countryCode?: string
  ): Observable<RegistrationOtpResponse> {
    const url = `${this.apiUrl}/api/auth/verify-otp`;

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

    return this.http.post<string>(url, payload, options).pipe(
      map(response => this.parseRegistrationResponse(response))
    );
  }

  getOnboardingResumeNavigation(user?: RegistrationDraftData | null): OnboardingResumeNavigation | null {
    return this.onboardingState.getResumeNavigation(user);
  }

  /**
   * Logout user and clear session
   */
  /**
   * POST /v1/auth/logout/{userId} — tells the backend to invalidate this
   * session server-side (e.g. revoke the token, drop device registration).
   */
  logoutUser(userId: string | number): Observable<{ success: boolean; message: string }> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: token?.startsWith('Bearer ') ? token : `Bearer ${token || ''}`
    });
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/auth/logout/${userId}`,
      {},
      { headers }
    );
  }

  async logout(redirectToLogin: boolean = true): Promise<void> {
    console.log('[AuthService] Logging out user');

    // Capture the id before any local state is cleared, and call the backend
    // logout endpoint first. Wait for it (and the local cleanup that follows)
    // to finish before this method resolves — the caller/navigation must not
    // treat the user as logged out until the old session data is actually gone.
    const userId = this.getUserId();
    if (userId) {
      try {
        await firstValueFrom(this.logoutUser(userId));
      } catch (error) {
        // Server-side logout failing shouldn't trap the user in a session
        // they can no longer use locally — fall through to local cleanup.
        console.warn('[AuthService] Backend logout call failed, continuing with local cleanup:', error);
      }
    }

    // Start device-token cleanup while the old session is still identifiable,
    // but revoke all local/in-memory access immediately rather than waiting on
    // network or native sign-out operations.
    const pushCleanup = this.pushNotifications.clearToken().catch(() => {});
    this.clearLocalUserState();
    this.analytics.clearUserId();
    this.crashlytics.clearUserId();

    // Logout should always stay inside the current app host. During local
    // development, sending web users to environment.publicWebUrl jumps from
    // localhost to the production marketing site and makes logout look broken.
    const navigation = redirectToLogin
      ? this.navCtrl.navigateRoot('/login', { animated: false })
      : Promise.resolve(true);

    await Promise.all([
      navigation,
      pushCleanup,
      this.authSessionCleanup.clearExternalAuthSessions()
    ]);

    if (redirectToLogin && typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
      window.location.replace('/login');
    }
  }

  private clearLocalUserState(): void {
    // Browser storage contains the security-sensitive session source of truth.
    // Clear it even if a subscriber reacting to the logged-out state throws.
    try {
      this.isAuthenticatedSubject.next(false);
      this.currentUserSubject.next(null);
      this.userDataSubject.next(null);
      this.removedFamilyMemberIds.clear();
      sessionStorage.removeItem(this.REMOVED_FAMILY_MEMBERS_KEY);
      sessionStorage.removeItem(this.FIRST_LOGGED_FOR_DAY_KEY);
    } catch (error) {
      console.warn('[AuthService] A logout-state subscriber failed:', error);
    }

    this.authSessionCleanup.clearBrowserStorage();

    // Singleton cache cleanup is best-effort and must never prevent token,
    // user-id, or cached browser data from being removed.
    try {
      this.authSessionCleanup.clearInMemoryUserData();
      this.moodService.clearVibesDisplayCache();
    } catch (error) {
      console.warn('[AuthService] Unable to clear an in-memory logout cache:', error);
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
   * Get the current user's age from the stored auth profile.
   */
  getCurrentUserAge(): number | null {
    const userData = this.getUserData();
    return this.extractAgeFromUserData(userData);
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
      const normalizedData = this.normalizeUserPetData(data);
      const currentData = this.userDataSubject.value || {};
      const updatedData = { ...currentData, ...normalizedData };
      
      // Handle nested avatar object
      if (normalizedData['avatar']) {
        updatedData['avatar'] = { ...(currentData['avatar'] || {}), ...normalizedData['avatar'] };
      }

      // Preserve pet metadata (id, gender and backend URL) when only petName
      // changes, while still supporting APIs that return a pet string.
      if (Object.prototype.hasOwnProperty.call(normalizedData, 'pet')) {
        const nextPet = normalizedData['pet'];
        const currentPet = (
          currentData['pet'] && typeof currentData['pet'] === 'object' && !Array.isArray(currentData['pet'])
        )
          ? currentData['pet']
          : {};
        updatedData['pet'] = (
          nextPet && typeof nextPet === 'object' && !Array.isArray(nextPet)
        )
          ? { ...currentPet, ...nextPet }
          : nextPet;
      }
      
      // Save to localStorage
      localStorage.setItem('user_data', JSON.stringify(updatedData));
      
      // Notify all subscribers
      this.userDataSubject.next(updatedData);
      this.syncPetFromUserData(updatedData);
      
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
      const normalizedData = this.normalizeUserPetData(data);
      localStorage.setItem('user_data', JSON.stringify(normalizedData));
      this.userDataSubject.next(normalizedData);
      this.syncPetFromUserData(normalizedData);
      console.log('[AuthService] User data set and broadcasted');
    } catch (error) {
      console.error('[AuthService] Error setting user data:', error);
    }
  }

  notifyFamilyMemberRemoved(member: string | number | { id?: string | number; userId?: string | number; memberId?: string | number }): void {
    const identities = this.getFamilyMemberIdentityValues(member);
    if (!identities.length) return;
    identities.forEach(id => this.removedFamilyMemberIds.add(id));
    this.persistRemovedFamilyMemberIds();
    const normalizedId = identities[0];

    const currentUser = this.getUserData();
    if (currentUser && Array.isArray(currentUser.familyMembers)) {
      this.setUserData({
        ...currentUser,
        familyMembers: this.excludeRemovedFamilyMembers(currentUser.familyMembers)
      });
    }
    this.familyMemberRemovedSubject.next(normalizedId);
  }

  /** Returns false for members that were successfully removed this session. */
  isFamilyMemberCurrent(member: any): boolean {
    this.restoreRemovedFamilyMemberIds();
    const identities = this.getFamilyMemberIdentityValues(member);
    return !identities.some(id => this.removedFamilyMemberIds.has(id));
  }

  /** Protects views from delayed family read-model responses after removal. */
  excludeRemovedFamilyMembers<T>(members: T[] | null | undefined): T[] {
    return Array.isArray(members)
      ? members.filter(member => this.isFamilyMemberCurrent(member))
      : [];
  }

  private getFamilyMemberIdentityValues(member: any): string[] {
    const source = member && typeof member === 'object'
      ? [member.userId, member.memberId, member.id]
      : [member];
    return Array.from(new Set(source
      .map(value => String(value ?? '').trim())
      .filter(Boolean)));
  }

  private restoreRemovedFamilyMemberIds(): void {
    try {
      const raw = sessionStorage.getItem(this.REMOVED_FAMILY_MEMBERS_KEY);
      const values = raw ? JSON.parse(raw) : [];
      if (Array.isArray(values)) {
        values.forEach(value => {
          const normalized = String(value ?? '').trim();
          if (normalized) this.removedFamilyMemberIds.add(normalized);
        });
      }
    } catch {
      // A malformed non-critical cache must never affect family rendering.
    }
  }

  private persistRemovedFamilyMemberIds(): void {
    try {
      sessionStorage.setItem(
        this.REMOVED_FAMILY_MEMBERS_KEY,
        JSON.stringify(Array.from(this.removedFamilyMemberIds))
      );
    } catch {
      // The in-memory set still protects the currently rendered screens.
    }
  }

  notifyFamilyChildCreated(child: any): void {
    if (child && typeof child === 'object') {
      this.familyChildCreatedSubject.next(child);
    }
  }

  private extractAgeFromUserData(userData: any): number | null {
    if (!userData) return null;

    const rawAge = userData.age ?? userData.userAge;
    const age = Number(rawAge);
    if (Number.isFinite(age) && age > 0) {
      return Math.floor(age);
    }

    const rawDob = userData.dateOfBirth || userData.dob || userData.birthDate;
    if (!rawDob) return null;

    const birthDate = new Date(rawDob);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    return calculatedAge > 0 ? calculatedAge : null;
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
   * A child who signed up without a family code yet. Registered/stored as
   * relationship SELF with asChild:true — not a real SELF user, and not yet
   * a real CHILD until they successfully call /family/convert-to-child.
   */
  isPendingChild(): boolean {
    try {
      const userData = this.getUserData();
      if (!userData || userData.relationship !== 'SELF' || userData.asChild !== true) {
        return false;
      }
      // "Skip for Now" on the join-family screen lets a pending child use the
      // app immediately without being bounced back here on every navigation —
      // they can still link to a family later from their profile.
      if (localStorage.getItem('familyLinkSkipped') === 'true') {
        return false;
      }
      return true;
    } catch (error) {
      console.error('[AuthService] Error checking pending-child state:', error);
      return false;
    }
  }

  /**
   * Get the appropriate dashboard route based on user's relationship
   */
  getDashboardRoute(): string {
    const relationship = this.getUserRelationship();

    console.log('[AuthService] Determining dashboard route:', {
      relationship,
      asChild: this.getUserData()?.asChild,
      timestamp: new Date().toISOString()
    });

    // A pending child (SELF + asChild:true) must link to a family before
    // seeing any dashboard — send them to the same "enter family code"
    // screen a UI-role 'child' signup already uses.
    if (this.isPendingChild()) {
      return '/home/join-family';
    }

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
      return this.extractPetFromUserData(userData) ?? null;
    } catch (error) {
      console.error('[AuthService] Error getting user pet:', error);
    }
    return null;
  }

  private syncPetFromUserData(userData: any): void {
    this.petAgeService.syncFromUserPet(this.extractPetFromUserData(userData));
  }

  /**
   * Backend responses have used both `user.pet` and a top-level `petName`.
   * Convert the latter into the same persisted shape so every screen receives
   * one source of truth, including immediately after registration.
   */
  private normalizeUserPetData(data: any): any {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'pet')) {
      return data;
    }

    const pet = this.extractPetFromUserData(data);
    return pet === undefined ? data : { ...data, pet };
  }

  /**
   * Supports all current API pet response shapes without inventing a default
   * pet when the server explicitly reports a null or unsupported value.
   */
  private extractPetFromUserData(userData: any): any | null | undefined {
    if (!userData || typeof userData !== 'object') {
      return undefined;
    }

    if (Object.prototype.hasOwnProperty.call(userData, 'pet')) {
      return userData.pet;
    }

    const hasTopLevelPet = Object.prototype.hasOwnProperty.call(userData, 'petName')
      || Object.prototype.hasOwnProperty.call(userData, 'petType')
      || Object.prototype.hasOwnProperty.call(userData, 'selectedPetName');
    if (!hasTopLevelPet) {
      return undefined;
    }

    const petName = userData.petName ?? userData.petType ?? userData.selectedPetName;
    if (petName === null || petName === '') {
      return null;
    }
    if (petName === undefined) {
      return undefined;
    }

    const url = userData.petUrl ?? userData.petImageUrl;
    return {
      petName: String(petName),
      ...(typeof url === 'string' && url ? { url } : {})
    };
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

  deleteAccountByUserId(userId: string | number): Observable<{ message?: string }> {
    const token = this.getToken();

    if (!token) {
      throw new Error('User not authenticated');
    }

    const headers = new HttpHeaders({
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Skip-Auth-Handler': 'true'
    });

    return this.http.delete<{ message?: string }>(`${this.apiUrl}/auth/delete-account/${userId}`, { headers });
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
   * Refresh the locally stored user session data.
   *
   * The former `/v1/users/{id}/profile` request is not supported by the
   * backend. It also received a selected child's `forUserId` from the global
   * profile interceptor, so it must not be issued from the mobile app.
   * @returns Observable<boolean> - true when a local authenticated session exists
   */
  refreshUserData(): Observable<boolean> {
    const token = this.getToken();
    const userId = this.getUserId();

    if (!token || !userId) {
      console.log('[AuthService] No valid session to refresh');
      return of(false);
    }

    // Keep existing callers stable without requesting the removed backend
    // endpoint. Supported domain APIs refresh their own data when needed.
    this.updateLastActivity();
    return of(true);
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

  private parseRegistrationResponse(response: unknown): RegistrationOtpResponse {
    if (response && typeof response === 'object') {
      return response as RegistrationOtpResponse;
    }

    const text = String(response ?? '').trim();
    if (!text) return { success: true };

    try {
      return JSON.parse(text) as RegistrationOtpResponse;
    } catch {
      return { success: true, message: text };
    }
  }
}
