import { AuthConfig } from 'angular-oauth2-oidc';
import { APP_CONFIG } from './app-config';

/**
 * Authorization Code + PKCE (S256) for a public client - no client secret anywhere in
 * this file or anywhere else in the FE. PKCE code_verifier/code_challenge, the "state"
 * CSRF value, and nonce are all generated and validated internally by the library.
 *
 * This client does receive a refresh_token (auth-server overrides Spring Authorization
 * Server's default refusal to issue one to a secretless/public client - see
 * BE/ARCHITECTURE.md section 8), used by authInterceptor on a 401. useSilentRefresh below
 * is a second, independent renewal path: a hidden iframe reloads /oauth2/authorize with
 * a fresh PKCE run; since the auth-server's login session cookie is same-site (same
 * registrable domain, "localhost", different port) it is still sent, so an active
 * session yields a fresh token with no visible redirect or re-login even if the refresh
 * token itself were ever unavailable.
 */
export const authCodeFlowConfig: AuthConfig = {
  issuer: APP_CONFIG.authIssuer,
  redirectUri: window.location.origin + '/callback',
  // Must exactly match the client's registered post-logout redirect URI on
  // auth-server (ClientRegistrationSeeder's OAUTH_POST_LOGOUT_REDIRECT_URI, default
  // "http://localhost:4200/") - otherwise Spring's OIDC /connect/logout rejects the
  // request with 400 before it ever redirects back here.
  postLogoutRedirectUri: window.location.origin + '/',
  clientId: APP_CONFIG.clientId,
  responseType: 'code',
  scope: APP_CONFIG.scope,
  oidc: true,
  requireHttps: false, // local http dev only
  strictDiscoveryDocumentValidation: false,
  sessionChecksEnabled: false,
  useSilentRefresh: true,
  silentRefreshRedirectUri: window.location.origin + '/silent-refresh.html',
  silentRefreshTimeout: 5000,
  timeoutFactor: 0.75,
  clockSkewInSec: 10,
  showDebugInformation: false,
};
