import { Injectable } from '@angular/core';
import { OAuthService, TokenResponse } from 'angular-oauth2-oidc';
import { authCodeFlowConfig } from './auth.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly oauthService: OAuthService) {
    this.oauthService.configure(authCodeFlowConfig);
  }

  /** Runs once at app bootstrap: handles the OIDC callback if present, otherwise just loads config. */
  async init(): Promise<void> {
    this.oauthService.setupAutomaticSilentRefresh();
    await this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  /** Full-page redirect to the authorization server; starts a fresh PKCE + state run. */
  login(): void {
    this.oauthService.initCodeFlow();
  }

  /** RP-initiated logout at the authorization server, then clears local tokens. */
  logout(): void {
    this.oauthService.logOut();
  }

  isLoggedIn(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  get accessToken(): string | null {
    return this.oauthService.hasValidAccessToken() ? this.oauthService.getAccessToken() : null;
  }

  /** The current session's refresh token, if the library has one stored (dev/testing convenience). */
  get refreshToken(): string | null {
    return this.oauthService.getRefreshToken() || null;
  }

  async silentRefresh(): Promise<void> {
    await this.oauthService.silentRefresh();
  }

  /**
   * Runs grant_type=refresh_token through the library, which stores the rotated access, refresh
   * AND id tokens it gets back.
   *
   * Using this rather than posting to /oauth2/token by hand matters for logout. The refresh grant
   * rotates the ID token server-side, and RP-initiated logout is validated by looking the
   * authorization up by the id_token_hint value - so a client that refreshed without recording the
   * new ID token keeps sending the superseded one, the lookup finds nothing, and the authorization
   * server answers invalid_token instead of logging anyone out.
   */
  async refreshWithStoredToken(): Promise<TokenResponse> {
    return this.oauthService.refreshToken();
  }
}
