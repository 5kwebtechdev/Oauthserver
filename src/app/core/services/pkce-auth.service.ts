import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import { flushSecureSession } from '../storage/session-storage';
import { secureTemporaryStorage as sessionStorage } from '../storage/session-storage';
import { sessionStorageAdapter as localStorage } from '../storage/session-storage';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { Injectable, Injector } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Capacitor, registerPlugin } from '@capacitor/core';

const authWebView = registerPlugin<{ open(options: { url: string }): Promise<{ callbackUrl?: string; appRoute?: string; action?: string; cancelled?: boolean; error?: string }> }>('AuthWebView');
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { LoadingService } from './loading.service';
import { OnboardingStateService } from './onboarding-state.service';
import { GOOGLE_AUTH_WEB_CLIENT_ID, isTrustedAndroidGooglePresenter } from '../config/google-auth.config';
const nativeGoogle = registerPlugin<{ signIn(options: { nonce: string; serverClientId: string }): Promise<{ idToken: string }> }>('NativeGoogleAuth');
class NativeGoogleSignInError extends Error {}


@Injectable({ providedIn: 'root' })
export class PkceAuthService {
  private readonly androidConfig = (environment as any).androidOAuth;
  // Kept as nativeDev for compatibility with existing callers; enabled per build config.
  readonly nativeDev = Capacitor.getPlatform() === 'android' && this.androidConfig?.enabled === true;
  readonly enabled = environment.oauth.enabled && (!Capacitor.isNativePlatform() || this.nativeDev);
  private nativeDiscovery?: Promise<void>;
  private stagedOidc?: Map<string, string | null>;
  private commitStagedOidc(): void {
    const staged = this.stagedOidc;
    this.stagedOidc = undefined;
    staged?.forEach((value, key) => value === null
      ? localStorage.removeItem('superme_oidc_' + key)
      : localStorage.setItem('superme_oidc_' + key, value));
  }
  private callbackRunning = false;
  private handledCallbacks = new Set<string>();
  private refreshUncertain = false;
  private get clientId(): string { return this.nativeDev ? this.androidConfig.clientId : environment.oauth.clientId; }
  error = '';
  private loggingOut = false;
  private failedRefreshLogout?: Promise<void>;
  private renewal?: Promise<void>;
  private lastRefreshHadIdToken = false;
  private initialization?: Promise<void>;
  private googleSignupProof = '';
  private nativeGoogleBusy = false;
  constructor(private oauth: OAuthService, private injector: Injector) {}

  init(): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    return this.initialization ??= this.initialize();
  }
  private async initialize(): Promise<void> {
    this.oauth.setStorage({
      getItem: key => this.stagedOidc?.has(key) ? this.stagedOidc.get(key)! : localStorage.getItem('superme_oidc_' + key),
      setItem: (key, value) => this.stagedOidc ? this.stagedOidc.set(key, value) : localStorage.setItem('superme_oidc_' + key, value),
      removeItem: key => this.stagedOidc ? this.stagedOidc.set(key, null) : localStorage.removeItem('superme_oidc_' + key)
    });
    this.oauth.configure({
      issuer: environment.oauth.issuer, clientId: this.clientId,
      redirectUri: this.nativeDev ? this.androidConfig.redirectUri : window.location.origin + '/callback',
      postLogoutRedirectUri: this.nativeDev ? this.androidConfig.logoutRedirectUri : window.location.origin + '/', responseType: 'code',
      openUri: uri => { if (this.nativeDev) void this.openNativeAuthorization(uri); else window.location.assign(uri); },
      scope: 'openid profile notes.read notes.write', oidc: true,
      requireHttps: environment.oauth.issuer.startsWith('https://'),
      strictDiscoveryDocumentValidation: true, useSilentRefresh: false,
      customTokenParameters: ['user'], showDebugInformation: false
    });
    if (this.nativeDev) {
      await App.addListener('appUrlOpen', event => { void this.handleNativeCallback(event.url); });
      const launch = await App.getLaunchUrl();
      if (launch?.url) void this.handleNativeCallback(launch.url);
      // Fresh/offline startup must reach Login without contacting the auth server.
      if (!launch?.url?.startsWith(this.androidConfig.redirectUri) && this.hasRefreshToken) void this.renewNativeSession();
      if (this.oauth.hasValidAccessToken()) this.syncSession();
      await App.addListener('appStateChange', state => { if (state.isActive) void this.renewNativeSession(); });
      setInterval(() => { if (!document.hidden) void this.renewNativeSession(); }, 60000);
      return;
    }
    try {
      await this.tryLoginOnce();
    } catch (err) {
      const isAuthorizationCallback = new URLSearchParams(window.location.search).has('code');
      // A callback's authorization code can only be redeemed once. If validation
      // fails after the token endpoint has consumed it, clearing storage and
      // replaying the same callback can never recover. Start one fresh PKCE flow
      // instead; this also replaces stale nonce/verifier data in long-lived tabs.
      if (this.restartCallbackWithFreshState()) return;
      if (isAuthorizationCallback) {
        console.error('[PkceAuthService] authorization callback failed; refusing to replay its one-time code', err);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_data');
        this.error = 'Could not complete sign in. Please try again.';
        return;
      }

      // The OIDC session state (nonce, PKCE verifier, cached discovery document) lives in
      // localStorage — not sessionStorage — so on a long-lived, frequently-used browser
      // profile it can go stale across deployments/client-id changes and make the next
      // loadDiscoveryDocumentAndTryLogin() throw, even though a guaranteed-fresh profile
      // (incognito, another browser) works fine. Clear it and retry once before giving up.
      console.error('[PkceAuthService] sign-in failed, retrying after clearing stale OIDC state', err);
      this.clearOidcStorage();
      try {
        await this.tryLoginOnce();
      } catch (err2) {
        console.error('[PkceAuthService] sign-in failed after retry', err2);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_data');
        this.error = 'Could not connect to sign in. Please try again.';
      }
    }
  }
  private async tryLoginOnce(): Promise<void> {
    await this.oauth.loadDiscoveryDocumentAndTryLogin();
    if (new URLSearchParams(window.location.search).has('code')
        && !this.oauth.hasValidAccessToken()) {
      throw new Error('Authorization callback completed without a valid access token.');
    }
    if (!this.oauth.hasValidAccessToken() && this.oauth.getRefreshToken()) await this.refresh();
    // On reload an older token may already have passed its renewal timer.
    if (this.oauth.hasValidAccessToken() && this.oauth.getRefreshToken()
        && this.oauth.getAccessTokenExpiration() - Date.now() <= 150000) await this.refresh();
    if (this.oauth.hasValidAccessToken()) {
      this.syncSession();
      try { sessionStorage.removeItem('pkce_callback_recovery_attempted'); } catch { /* Best effort. */ }
    }
    else {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_data');
    }
    this.oauth.events.subscribe(event => {
      if (event.type === 'token_expires' && (event as { info?: string }).info === 'access_token') void this.refresh().catch(() => {});
    });
  }
  private clearOidcStorage(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith('superme_oidc_'))
      .forEach(key => localStorage.removeItem(key));
  }
  private restartCallbackWithFreshState(): boolean {
    if (!new URLSearchParams(window.location.search).has('code')) return false;
    const recoveryKey = 'pkce_callback_recovery_attempted';
    try {
      if (sessionStorage.getItem(recoveryKey) === 'true') return false;
      sessionStorage.setItem(recoveryKey, 'true');
    } catch {
      // Without a session-scoped loop guard, leave the callback error visible.
      return false;
    }

    this.clearOidcStorage();
    window.history.replaceState({}, document.title, window.location.pathname);
    try {
      this.oauth.initCodeFlow();
      return true;
    } catch (error) {
      sessionStorage.removeItem(recoveryKey);
      console.error('[PkceAuthService] unable to restart authorization after callback failure', error);
      return false;
    }
  }
  async loginAfterRegistration(credentials: { email?: string; phone?: string; password: string; turnstileToken?: string }): Promise<void> {
    await this.init();
    if (this.nativeDev) return this.login();
    if (this.error) throw new Error(this.error);
    await firstValueFrom(this.injector.get(HttpClient).post(
      environment.oauth.issuer + '/v1/auth/session-login',
      { email: credentials.email, phone: credentials.phone, password: credentials.password },
      { withCredentials: true, params: { client_id: environment.oauth.clientId } }
    ));
    await this.login();
  }
  /** Verifies Google proof in this client's database, then starts the PKCE exchange. */
  async googleLogin(idToken: string, resumeSignup = false): Promise<void> {
    if (this.nativeDev) {
      if (resumeSignup) sessionStorage.setItem('pkce_social_onboarding_resume', 'true');
      return this.login();
    }
    // Keep the verified proof in this singleton as a same-tab fallback while
    // the social signup wizard moves between routes. Session storage remains
    // the reload-safe copy; this covers accidental removal during navigation.
    if (idToken) this.googleSignupProof = idToken;
    // Returning accounts may have stale signup state in this tab. Only the
    // explicit in-progress signup session should resume onboarding at callback.
    if (resumeSignup) sessionStorage.setItem('pkce_social_onboarding_resume', 'true');
    else sessionStorage.removeItem('pkce_social_onboarding_resume');
    await this.init();
    if (this.error) throw new Error(this.error);
    await firstValueFrom(this.injector.get(HttpClient).post(
      environment.oauth.issuer + '/api/auth/google-login',
      { idToken },
      { withCredentials: true, params: { client_id: environment.oauth.clientId } }
    ).pipe(timeout({ first: 20_000 })));
    await this.login();
  }
  getGoogleSignupProof(): string { return this.googleSignupProof; }
  clearGoogleSignupProof(): void { this.googleSignupProof = ''; }
  /**
   * Signs this browser in using the one-time pass an app put in the URL, then runs the normal
   * authorization-code flow, which now completes without prompting because the exchange set this
   * server's session cookie. Mirrors googleLogin: redeem a proof, then start the standard flow.
   *
   * The pass is spent server-side the moment it is redeemed, so reloading this page or sharing
   * the link signs nobody in.
   */
  async handoffLogin(ticket: string, returnUrl = ''): Promise<void> {
    await this.init();
    if (this.error) throw new Error(this.error);
    await firstValueFrom(this.injector.get(HttpClient).post(
      `${environment.oauth.issuer}/api/auth/handoff-login?client_id=${encodeURIComponent(environment.oauth.clientId)}`,
      { ticket },
      { withCredentials: true }
    ).pipe(timeout({ first: 20_000 })));
    await this.login(returnUrl);
  }
  async login(returnUrl = ''): Promise<void> {
    await this.init();
    if (!this.nativeDev && this.error) throw new Error(this.error);
    if (this.nativeDev) {
      if (this.nativeGoogleBusy) throw new NativeGoogleSignInError('Google sign-in is already in progress.');
      this.error = ''; await this.ensureNativeDiscovery();
    }
    if (returnUrl.startsWith('/') && !returnUrl.startsWith('//') && !/^\/(login|callback)(?:[/?]|$)/.test(returnUrl)) {
      sessionStorage.setItem('pkce_return_url', returnUrl);
    }
    sessionStorage.removeItem('pkce_callback_recovery_attempted');
    this.loggingOut = false;
    this.failedRefreshLogout = undefined;
    this.refreshUncertain = false;
    this.oauth.initCodeFlow();
    await flushSecureSession();
  }
  private ensureNativeDiscovery(): Promise<void> {
    if (!this.nativeDiscovery) {
      this.nativeDiscovery = this.oauth.loadDiscoveryDocument().then(() => undefined).catch(() => {
        this.nativeDiscovery = undefined;
        throw new Error('Unable to connect to secure sign in. Please check your connection and try again.');
      });
    }
    return this.nativeDiscovery;
  }
  private async openNativeAuthorization(url: string): Promise<void> {
    try {
      const authorization = new URL(url);
      const libraryState = authorization.searchParams.get('state');
      const nonce = authorization.searchParams.get('nonce');
      if (!libraryState || !nonce) throw new Error('Missing OAuth correlation values.');
      // Keep the browser state independent of the library's OIDC nonce-based state.
      // After checking the browser callback, restore library state for its own validation.
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const state = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      localStorage.setItem('superme_oidc_android_pending', JSON.stringify({ state, libraryState, oidcNonce: nonce, codeChallenge: authorization.searchParams.get('code_challenge'), createdAt: Date.now() }));
      authorization.searchParams.set('state', state);
      await flushSecureSession();
      await this.openAuthorizationTab(authorization.toString());
    } catch {
      // Native secure webview failed to open; fall back to the plain browser
      // redirect instead of surfacing an error to the user.
      localStorage.removeItem('superme_oidc_android_pending');
      window.location.assign(url);
    }
  }
  private async openAuthorizationTab(url: string): Promise<void> {
    const result = await this.launchAuthWebView(url);
    if (result.action === 'google') {
      await this.completeNativeGoogle();
    } else if (result.appRoute === '/signup' || result.appRoute === '/forgot-password') {
      localStorage.removeItem('superme_oidc_android_pending');
      this.error = '';
      await flushSecureSession();
      await this.injector.get(Router).navigateByUrl(result.appRoute, { replaceUrl: true });
    } else if (result.callbackUrl) await this.handleNativeCallback(result.callbackUrl);
    else throw new Error(result.error === 'tls_error' ? 'Secure connection failed.' : 'Sign in was closed or could not load.');
  }
  private launchAuthWebView(url: string): Promise<{ callbackUrl?: string; appRoute?: string; action?: string; cancelled?: boolean; error?: string }> {
    return authWebView.open({ url });
  }
  private randomGoogleNonce(): string {
    return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  private async googleSecurityCheck(context: any, googleNonce: string): Promise<{ ticket: string; transactionId: string; expiresAt: number }> {
    const http = this.injector.get(HttpClient);
    const headers = { 'X-Skip-Authorization': 'true', 'X-Skip-Profile-Selector': 'true', 'X-Skip-Loading': 'true', Accept: 'application/json' };
    const transaction = await firstValueFrom(http.post<any>(environment.oauth.issuer + '/v1/auth/android-dev/google/turnstile', {
      clientId: this.clientId, redirectUri: this.androidConfig.redirectUri,
      codeChallenge: context.codeChallenge, codeChallengeMethod: 'S256', googleNonce,
      oidcNonce: context.oidcNonce, state: context.state
    }, { headers }).pipe(timeout({ first: 20000 })));
    try {
      if (typeof transaction.transactionId !== 'string' || !transaction.transactionId || !(transaction.expires_in > 0 && transaction.expires_in <= 300)) throw new Error();
      const securityUrl = new URL(transaction.securityCheckUrl);
      if (securityUrl.origin !== environment.oauth.issuer || securityUrl.pathname !== '/android-dev/google-security'
          || securityUrl.username || securityUrl.password || securityUrl.hash
          || securityUrl.searchParams.getAll('transaction').length !== 1
          || securityUrl.searchParams.get('transaction') !== transaction.transactionId) throw new Error();
      const expiresAt = Date.now() + transaction.expires_in * 1000;
      const result = await this.launchAuthWebView(securityUrl.toString());
      if (!result.callbackUrl || result.cancelled || result.error) throw new Error();
      const callback = new URL(result.callbackUrl);
      if (callback.protocol + '//' + callback.host + callback.pathname !== this.androidConfig.redirectUri
          || callback.username || callback.password || callback.hash
          || callback.searchParams.getAll('state').length !== 1 || callback.searchParams.get('state') !== context.state
          || callback.searchParams.getAll('android_google_ticket').length !== 1
          || !callback.searchParams.get('android_google_ticket') || callback.searchParams.has('error') || callback.searchParams.has('code')
          || Date.now() >= expiresAt) throw new Error();
      return { ticket: callback.searchParams.get('android_google_ticket')!, transactionId: transaction.transactionId, expiresAt };
    } catch {
      await this.cancelGoogleTransaction(transaction.transactionId);
      throw new NativeGoogleSignInError('Google security check was cancelled, expired or could not be verified. Please start again.');
    }
  }
  private async cancelGoogleTransaction(transactionId: string): Promise<void> {
    if (typeof transactionId !== 'string' || !transactionId) return;
    try {
      await firstValueFrom(this.injector.get(HttpClient).post(environment.oauth.issuer + '/v1/auth/android-dev/google/turnstile/cancel',
        { transactionId }, { headers: { 'X-Skip-Authorization': 'true', 'X-Skip-Profile-Selector': 'true', 'X-Skip-Loading': 'true' } }
      ).pipe(timeout({ first: 5000 })));
    } catch { /* Local attempt is discarded even when cancellation is offline. */ }
  }
  private googleCredential(nonce: string): Promise<{ idToken: string }> {
    return nativeGoogle.signIn({ nonce, serverClientId: GOOGLE_AUTH_WEB_CLIENT_ID });
  }
  private googleClaims(token: string): any {
    try {
      const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(part + '='.repeat((4 - part.length % 4) % 4)), char => char.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch { throw new NativeGoogleSignInError('Google returned an invalid credential. Please try again.'); }
  }
  private async completeNativeGoogle(): Promise<void> {
    if (!this.nativeDev || this.nativeGoogleBusy) throw new NativeGoogleSignInError('Google sign-in is already in progress.');
    this.nativeGoogleBusy = true;
    const loading = this.injector.get(LoadingService);
    let loader: string | undefined;
    let googleIdToken = '';
    let security: { ticket: string; transactionId: string; expiresAt: number } | undefined;
    let completed = false;
    try {
      const context = JSON.parse(localStorage.getItem('superme_oidc_android_pending') || 'null');
      if (!context?.state || !context.libraryState || !context.oidcNonce || !/^[A-Za-z0-9_-]{43}$/.test(context.codeChallenge || '')
          || !context.createdAt || Date.now() - context.createdAt > 600000) throw new NativeGoogleSignInError('Sign-in expired. Please start again.');
      const stillCurrent = () => {
        const current = JSON.parse(localStorage.getItem('superme_oidc_android_pending') || 'null');
        if (this.loggingOut || current?.state !== context.state || Date.now() - context.createdAt > 600000) throw new NativeGoogleSignInError('Sign-in expired or was cancelled. Please start again.');
      };
      const googleNonce = this.randomGoogleNonce();
      security = await this.googleSecurityCheck(context, googleNonce);
      stillCurrent();
      loader = loading.show(undefined, { delayMs: 0, minVisibleMs: 100 });
      googleIdToken = (await this.googleCredential(googleNonce)).idToken;
      stillCurrent();
      const claims = this.googleClaims(googleIdToken);
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      // Preflight only; the server remains responsible for signature/issuer/expiry verification.
      if (audiences.length !== 1 || audiences[0] !== GOOGLE_AUTH_WEB_CLIENT_ID) {
        throw new NativeGoogleSignInError('Google sign-in configuration could not be verified (G-AUD). Please contact support.');
      }
      if (!isTrustedAndroidGooglePresenter(claims.azp, environment.production)) {
        throw new NativeGoogleSignInError('Google sign-in configuration could not be verified (G-ANDROID). Please contact support.');
      }
      if (claims.nonce !== googleNonce) {
        throw new NativeGoogleSignInError('Google sign-in attempt could not be verified (G-NONCE). Please try again.');
      }
      if (Date.now() >= security.expiresAt) throw new NativeGoogleSignInError('Google security check expired. Please start again.');
      let response: { code: string; expires_in: number };
      try {
        response = await firstValueFrom(this.injector.get(HttpClient).post<{ code: string; expires_in: number }>(
          environment.oauth.issuer + '/v1/auth/android-dev/google/exchange', {
            googleIdToken, clientId: this.clientId, handoffTicket: security.ticket
          }, { headers: { 'X-Skip-Authorization': 'true', 'X-Skip-Profile-Selector': 'true', 'X-Skip-Loading': 'true', Accept: 'application/json' } }
        ).pipe(timeout({ first: 20000 })));
      } catch (error: any) {
        if (error?.status === 409 && error?.error?.error === 'registration_required') {
          stillCurrent();
          await this.startNativeGoogleRegistration(error.error, claims, googleIdToken);
          return;
        }
        const code = error?.error?.error;
        const message = code === 'captcha_failed' ? 'The security check expired or failed. Please try again.'
          : error?.status === 429 ? 'Too many sign-in attempts. Please wait and try again.'
          : error?.status === 503 ? 'Google sign-in is temporarily unavailable. Please contact support.'
          : code === 'unusable_account' ? 'This account cannot sign in. Please contact support.'
          : code === 'google_token_replayed' ? 'This sign-in attempt has already been used. Please start again.'
          : 'Google sign-in could not be verified. Please try again.';
        throw new NativeGoogleSignInError(message);
      }
      stillCurrent();
      if (typeof response.code !== 'string' || !response.code.trim() || !(response.expires_in > 0 && response.expires_in <= 60)) throw new NativeGoogleSignInError('Google sign-in returned an invalid response. Please try again.');
      // Internal callback parameters only: this URL is never opened or requested.
      await this.handleNativeCallback(this.androidConfig.redirectUri + '?' + new URLSearchParams({ code: response.code, state: context.state }));
      if (this.error || !this.token) throw new NativeGoogleSignInError(this.error || 'Google sign-in did not finish. Please try again.');
      this.googleSignupProof = '';
      completed = true;
    } catch (error: any) {
      if (error instanceof NativeGoogleSignInError) throw error;
      throw new NativeGoogleSignInError(error?.code === 'GOOGLE_CANCELLED' ? 'Google sign-in was cancelled. Please try again.' : 'Google sign-in could not finish. Please try again.');
    } finally {
      if (!completed) {
        localStorage.removeItem('superme_oidc_android_pending');
        await flushSecureSession();
        if (security) await this.cancelGoogleTransaction(security.transactionId);
      }
      googleIdToken = '';
      this.nativeGoogleBusy = false;
      if (loader) loading.hide(loader);
    }
  }
  private async startNativeGoogleRegistration(profile: any, claims: any, token: string): Promise<void> {
    if (typeof profile.email !== 'string' || !profile.email || typeof claims.sub !== 'string' || !claims.sub) throw new NativeGoogleSignInError('Google profile information is incomplete. Please try again.');
    const onboarding = this.injector.get(OnboardingStateService);
    const referralCode = sessionStorage.getItem('referralCode');
    for (const key of ['managed_child_signup', 'managed_child_family_code', 'managed_child_success_email', 'create_child_after_family',
      'signup_role', 'signup_profile', 'signup_avatar', 'signup_pet', 'familyCode', 'show_child_welcome_after_family',
      'oauth_signup_id_token', 'oauth_signup_access_token', 'oauth_signup_identity_token', 'oauth_signup_authorization_code',
      'oauth_signup_server_auth_code', 'oauth_signup_raw_nonce', 'oauth_signup_client_id',
      'oauth_signup_is_development_mock', 'oauth_signup_session_pending']) sessionStorage.removeItem(key);
    this.googleSignupProof = token; // Memory only; no authenticated session is created by a 409.
    sessionStorage.setItem('signup_via_google', 'true'); sessionStorage.setItem('signup_via_oauth', 'true');
    sessionStorage.setItem('oauth_signup_provider', 'google'); sessionStorage.setItem('oauth_signup_pending_submission', 'true');
    sessionStorage.setItem('google_signup_email', profile.email); sessionStorage.setItem('requestedIdentifier', profile.email);
    sessionStorage.setItem('google_signup_name', typeof profile.name === 'string' ? profile.name : '');
    sessionStorage.setItem('google_signup_avatar', typeof profile.pictureUrl === 'string' ? profile.pictureUrl : '');
    sessionStorage.setItem('google_signup_provider_id', claims.sub);
    onboarding.clearRegistrationDraft();
    onboarding.saveRegistrationDraft({ email: profile.email, name: typeof profile.name === 'string' ? profile.name : '',
      authProvider: 'google', socialProviderId: claims.sub, socialOnboarding: true, socialDetailsCompleted: false,
      socialRolePending: true, nativeGoogleRegistration: true, onboardingStep: 3, ...(referralCode ? { referralCode } : {}) }, 3, 'EMAIL');
    localStorage.removeItem('superme_oidc_android_pending');
    await flushSecureSession();
    this.error = '';
    await this.injector.get(Router).navigate(['/signup'], { queryParams: { step: 1 }, replaceUrl: true });
  }
  async openNativeLogout(url: string): Promise<void> {
    try {
      const result = await this.launchAuthWebView(url);
      if (!result.callbackUrl || new URL(result.callbackUrl).href !== this.androidConfig.logoutRedirectUri) throw new Error('Logout did not return.');
      this.error = '';
    } catch { this.error = 'You are signed out. The hosted sign-out page could not finish.'; }
    finally {
      // The signed-out route may already be mounted in Ionic's router outlet.
      // Start authorization explicitly: navigating to that same URL does not
      // rerun ngOnInit and previously left the app without the hosted page.
      try { await this.login(); }
      catch {
        this.error = 'You are signed out. Could not open sign in. Please check your connection and try again.';
        await this.injector.get(Router).navigateByUrl('/login?loggedOut=1', { replaceUrl: true });
      }
    }
  }
  private async renewNativeSession(): Promise<void> {
    if (this.loggingOut || this.callbackRunning || !this.hasRefreshToken || this.refreshUncertain) return;
    if (this.oauth.hasValidAccessToken() && this.oauth.getAccessTokenExpiration() - Date.now() > 120000) return;
    try { await this.refresh(); }
    catch (error: any) {
      if (error?.error?.error === 'invalid_grant') await this.logoutAfterRefreshFailure();
      else this.error = 'Unable to renew your session right now. Please check your connection.';
    }
  }
  async handleNativeCallback(raw: string): Promise<void> {
    if (!this.nativeDev) return;
    let url: URL;
    try { url = new URL(raw); } catch { return; }
    const target = url.protocol + '//' + url.host + url.pathname;
    if (target === this.androidConfig.logoutRedirectUri) {
      await this.injector.get(Router).navigateByUrl('/login?loggedOut=1');
      return;
    }
    if (url.searchParams.has('android_google_ticket')) return;
    if (target !== this.androidConfig.redirectUri || this.callbackRunning || this.handledCallbacks.has(raw)) return;
    this.callbackRunning = true;
    this.handledCallbacks.add(raw);
    try {
      if (!url.searchParams.get('code') || !url.searchParams.get('state') || url.searchParams.has('error')) throw new Error('Sign in was cancelled or incomplete.');
      const pending = JSON.parse(localStorage.getItem('superme_oidc_android_pending') || 'null');
      if (!pending?.state || !pending.libraryState || url.searchParams.get('state') !== pending.state) throw new Error('Invalid sign-in state.');
      localStorage.removeItem('superme_oidc_android_pending');
      await this.ensureNativeDiscovery();
      this.stagedOidc = new Map();
      const callback = new URLSearchParams(url.search);
      callback.set('state', pending.libraryState);
      await this.oauth.tryLoginCodeFlow({ customHashFragment: '?' + callback.toString(), preventClearHashAfterLogin: true });
      if (!this.oauth.hasValidAccessToken()) throw new Error('Sign in did not return a valid session.');
      this.commitStagedOidc();
      this.syncSession();
      await flushSecureSession();
      await this.injector.get(Router).navigateByUrl('/callback');
    } catch {
      this.stagedOidc = undefined;
      this.error = 'Could not complete sign in. Please try again.';
      await this.injector.get(Router).navigateByUrl('/login');
    } finally { this.callbackRunning = false; }
  }
  get token(): string | null {
    return this.oauth.hasValidAccessToken() ? this.oauth.getAccessToken() : null;
  }
  refresh(): Promise<void> {
    if (this.nativeDev && this.refreshUncertain) return Promise.reject(new Error('Refresh result is uncertain; please sign in again.'));
    if (this.loggingOut) return Promise.reject(new Error('Logout is in progress.'));
    if (!this.renewal) this.startRefresh();
    return this.renewal!;
  }
  get hasRefreshToken(): boolean { return !!this.oauth.getRefreshToken(); }
  logoutAfterRefreshFailure(): Promise<void> {
    if (!this.failedRefreshLogout) {
      // The failed exchange may have consumed/revoked the refresh token. Do
      // not attempt it again merely to obtain a logout hint.
      this.failedRefreshLogout = this.injector.get(AuthService).logout(true, false);
    }
    return this.failedRefreshLogout;
  }
  private startRefresh(): void {
    const originalRefreshToken = this.oauth.getRefreshToken();
    if (!originalRefreshToken) {
      this.renewal = Promise.reject(new Error('No refresh token is stored.'));
    } else {
      const exchange = async (): Promise<void> => {
        const sessionUserId = localStorage.getItem('user_id');
        const currentRefreshToken = this.oauth.getRefreshToken();
        if (!currentRefreshToken) throw new Error('The refresh token was removed.');
        // Another tab may have rotated the shared token while this tab waited for the lock.
        if (currentRefreshToken !== originalRefreshToken) {
          this.lastRefreshHadIdToken = !!this.oauth.getIdToken();
          this.syncSession();
          return;
        }
        if (this.nativeDev) await this.ensureNativeDiscovery();
        if (this.nativeDev) this.stagedOidc = new Map();
        let response: any;
        try { response = await this.oauth.refreshToken(); }
        catch (error: any) {
          this.stagedOidc = undefined;
          if (this.nativeDev && (!error?.status || error.status >= 500)) this.refreshUncertain = true;
          throw error;
        }
        if (sessionUserId && localStorage.getItem('user_id') !== sessionUserId) {
          // The other tab logged out or switched accounts while the exchange
          // was in flight. Discard tokens the response just wrote to storage.
          if (this.nativeDev) this.stagedOidc = undefined;
          else this.clearOidcStorage();
          throw new Error('The user session changed during token refresh.');
        }
        this.lastRefreshHadIdToken = typeof response?.id_token === 'string' && !!response.id_token;
        if (this.nativeDev) this.commitStagedOidc();
        this.syncSession();
        await flushSecureSession();
      };
      this.renewal = this.withRefreshLock(exchange);
    }
    this.renewal = this.renewal.finally(() => { this.renewal = undefined; });
  }
  private withRefreshLock(exchange: () => Promise<void>): Promise<void> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks ? locks.request('superme-oidc-refresh', exchange) : exchange();
  }
  private syncSession(): void {
    const user = this.oauth.getCustomTokenResponseProperty('user');
    if (!user?.id) throw new Error('The token response did not include a user profile.');
    const auth = this.injector.get(AuthService);
    if (localStorage.getItem('user_id') === String(user.id) && localStorage.getItem('auth_token')) {
      localStorage.setItem('auth_token', this.oauth.getAccessToken());
      auth.setUserData(user);
    } else {
      // Account-switch cleanup clears browser storage. Preserve only this newly
      // validated OAuth transaction, never the previous account's app data.
      const tokens = Object.keys(localStorage).filter(key => key.startsWith('superme_oidc_'))
        .map(key => [key, localStorage.getItem(key)!] as const);
      const token = this.oauth.getAccessToken();
      try { auth.setSession({ token, userId: user.id, user }); }
      finally { tokens.forEach(([key, value]) => localStorage.setItem(key, value)); }
    }
  }
  async prepareLogout(refreshBeforeLogout = true): Promise<string | null> {
    if (!this.enabled) return null;
    this.loggingOut = true;
    this.oauth.stopAutomaticRefresh();
    if (this.nativeDev) {
      try {
        if (this.renewal) await this.renewal;
        const refresh = this.oauth.getRefreshToken();
        if (refresh) await firstValueFrom(this.injector.get(HttpClient).post(
          environment.oauth.issuer + '/oauth2/revoke',
          new URLSearchParams({ token: refresh, token_type_hint: 'refresh_token', client_id: this.clientId }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Skip-Profile-Selector': 'true' } }
        ).pipe(timeout({ first: 10000 })));
      } catch { /* Local logout still proceeds; never log token values. */ }
      return this.logoutUrl(this.lastRefreshHadIdToken && this.oauth.hasValidIdToken() ? this.oauth.getIdToken() : '');
    }
    // Explicit logout needs a newly issued ID token. A failed refresh must
    // never fall back to an older id_token_hint.
    if (!refreshBeforeLogout || !this.hasRefreshToken) return this.nativeDev ? this.logoutUrl('') : null;
    try {
      if (this.renewal) await this.renewal;
      else { this.startRefresh(); await this.renewal; }
      if (!this.lastRefreshHadIdToken) return this.nativeDev ? this.logoutUrl('') : null;
      return this.logoutUrl(this.oauth.getIdToken());
    } catch (error) {
      console.warn('[PkceAuthService] Could not refresh the ID token for logout');
      return this.nativeDev ? this.logoutUrl('') : null;
    }
  }
  logoutUrl(idToken: string): string | null {
    const endpoint = this.nativeDev ? environment.oauth.issuer + '/android-dev-logout' : this.oauth.logoutUrl;
    if (!this.enabled || !endpoint) return null;
    // No ID token means no real OIDC session was ever established on this
    // tab (e.g. a Google/Apple signup that authenticated through the legacy
    // SuperMeBE endpoint and called AuthService.setSession() directly,
    // without ever exercising the authorization-code flow). Hitting
    // /connect/logout then has nothing to invalidate server-side, and
    // Spring's RP-initiated logout endpoint 400s on a literal "null"
    // id_token_hint (URLSearchParams coerces the JS null to that string) -
    // surfacing as a Whitelabel Error Page instead of landing on the
    // dashboard. Returning null here makes AuthService.logout() skip the
    // external redirect and fall back to its local navigation instead.
    if (!idToken && !this.nativeDev) return null;
    const url = new URL(endpoint);
    url.searchParams.set('client_id', this.clientId);
    if (idToken) url.searchParams.set('id_token_hint', idToken);
    url.searchParams.set('post_logout_redirect_uri', this.nativeDev ? this.androidConfig.logoutRedirectUri : window.location.origin + '/');
    return url.toString();
  }
}
