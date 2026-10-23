import { AuthConfig } from 'angular-oauth2-oidc';
import { APP_CONFIG } from './app-config';

/**
 * Authorization Code + PKCE (S256) for a public client - no client secret anywhere in
 * this file or anywhere else in the FE. PKCE code_verifier/code_challenge, the "state"
 * CSRF value, and nonce are all generated and validated internally by the library.
 *
 * This client does receive a refresh_token (auth-server overrides Spring Authorization
 * Server's default refusal to issue one to a secretless/public client - see
 * BE/ARCHITECTURE.md section 8), used by authInterceptor on a 401.
 *
 * useSilentRefresh is intentionally disabled (see below). It used to run a hidden
 * iframe that reloaded /oauth2/authorize on a fresh PKCE run; because the auth-server
 * login session cookie is same-site (same registrable domain, "localhost", different
 * port) it was still sent, so an active server-side session silently handed back a new
 * token with no visible redirect or re-login - even for a user who had closed the tab
 * without logging out. That's the "it auto-logs me back in" bug. Disabling it means a
 * user with no valid local token always hits a real /oauth2/authorize redirect instead
 * of the invisible iframe path. Note this alone does not force a fresh login prompt if
 * the auth-server session cookie is still alive - Spring Security can still
 * auto-approve that visible redirect too. Killing/shortening that server-side session
 * (or calling end-session on tab close) is the other half of the fix.
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
  useSilentRefresh: false,
  silentRefreshRedirectUri: window.location.origin + '/silent-refresh.html',
  silentRefreshTimeout: 5000,
  timeoutFactor: 0.75,
  clockSkewInSec: 10,
  showDebugInformation: false,
};
