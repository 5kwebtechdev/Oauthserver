import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { Injectable, Injector } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PkceAuthService {
  readonly enabled = environment.oauth.enabled && !Capacitor.isNativePlatform();
  error = '';
  private loggingOut = false;
  private renewal?: Promise<void>;
  private initialization?: Promise<void>;
  constructor(private oauth: OAuthService, private injector: Injector) {}

  init(): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    return this.initialization ??= this.initialize();
  }
  private async initialize(): Promise<void> {
    this.oauth.setStorage({
      getItem: key => localStorage.getItem('superme_oidc_' + key),
      setItem: (key, value) => localStorage.setItem('superme_oidc_' + key, value),
      removeItem: key => localStorage.removeItem('superme_oidc_' + key)
    });
    this.oauth.configure({
      issuer: environment.oauth.issuer, clientId: environment.oauth.clientId,
      redirectUri: window.location.origin + '/callback',
      postLogoutRedirectUri: window.location.origin + '/', responseType: 'code',
      scope: 'openid profile notes.read notes.write', oidc: true,
      requireHttps: environment.oauth.issuer.startsWith('https://'),
      strictDiscoveryDocumentValidation: true, useSilentRefresh: false,
      customTokenParameters: ['user'], showDebugInformation: false
    });
    try {
      await this.oauth.loadDiscoveryDocumentAndTryLogin();
      if (!this.oauth.hasValidAccessToken() && this.oauth.getRefreshToken()) await this.refresh();
      // On reload an older token may already have passed its renewal timer.
      if (this.oauth.hasValidAccessToken() && this.oauth.getRefreshToken()
          && this.oauth.getAccessTokenExpiration() - Date.now() <= 150000) await this.refresh();
      if (this.oauth.hasValidAccessToken()) this.syncSession();
      else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_data');
      }
      this.oauth.events.subscribe(event => {
        if (event.type === 'token_expires' && (event as { info?: string }).info === 'access_token') void this.refresh().catch(() => {});
      });
    } catch {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_data');
      this.error = 'Could not connect to sign in. Please try again.';
    }
  }
  async loginAfterRegistration(credentials: { email?: string; phone?: string; password: string }): Promise<void> {
    await this.init();
    if (this.error) throw new Error(this.error);
    await firstValueFrom(this.injector.get(HttpClient).post(
      environment.oauth.issuer + '/v1/auth/session-login',
      { email: credentials.email, phone: credentials.phone, password: credentials.password },
      { withCredentials: true }
    ));
    await this.login();
  }
  /** Verifies Google proof in this client's database, then starts the PKCE exchange. */
  async googleLogin(idToken: string, resumeSignup = false): Promise<void> {
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
  async login(returnUrl = ''): Promise<void> {
    await this.init();
    if (this.error) throw new Error(this.error);
    if (returnUrl.startsWith('/') && !returnUrl.startsWith('//') && !/^\/(login|callback)(?:[/?]|$)/.test(returnUrl)) {
      sessionStorage.setItem('pkce_return_url', returnUrl);
    }
    this.oauth.initCodeFlow();
  }
  get token(): string | null {
    return this.oauth.hasValidAccessToken() ? this.oauth.getAccessToken() : null;
  }
  refresh(): Promise<void> {
    if (this.loggingOut) return Promise.reject(new Error('Logout is in progress.'));
    if (!this.renewal) {
      this.renewal = this.oauth.refreshToken().then(() => this.syncSession())
        .finally(() => { this.renewal = undefined; });
    }
    return this.renewal;
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
  async prepareLogout(): Promise<string | null> {
    if (!this.enabled) return null;
    this.loggingOut = true;
    this.oauth.stopAutomaticRefresh();
    // A refresh rotates the ID token. Finish any in-flight exchange before
    // reading the logout hint, and prevent further renewal during cleanup.
    if (this.renewal) {
      try { await this.renewal; } catch { /* Use the latest stored ID token. */ }
    }
    return this.logoutUrl();
  }
  logoutUrl(): string | null {
    if (!this.enabled || !this.oauth.logoutUrl) return null;
    const idToken = this.oauth.getIdToken();
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
    if (!idToken) return null;
    const url = new URL(this.oauth.logoutUrl);
    url.searchParams.set('client_id', environment.oauth.clientId);
    url.searchParams.set('id_token_hint', idToken);
    url.searchParams.set('post_logout_redirect_uri', window.location.origin + '/');
    return url.toString();
  }
}
