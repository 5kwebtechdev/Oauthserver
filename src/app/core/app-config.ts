/**
 * Local-dev defaults. In a real deployment these would come from a build-time
 * environment file or runtime config endpoint - kept as plain constants here to match
 * this project's scope (a single local dev target), not hardcoded security material.
 */
export const APP_CONFIG = {
  authIssuer: 'http://localhost:9000',
  clientId: 'pkce-angular-client',
  resourceServerBaseUrl: 'http://localhost:8080',
  scope: 'openid profile notes.read notes.write',
  // Cloudflare Turnstile site key - public, safe to embed in frontend code. Empty until
  // a real key is created (see ARCHITECTURE.md): the backend's TurnstileVerificationService
  // treats a missing secret-key as "not configured" and skips enforcement, so the app
  // stays usable without one; an empty site key here just means the widget renders nothing.
  turnstileSiteKey: '',
};
