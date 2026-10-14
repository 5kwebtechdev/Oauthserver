// Public production endpoints. No credentials or signing keys belong in the frontend.
export const APP_CONFIG = {
  authIssuer: 'http://187.127.142.16:9000',
  clientId: 'pkce-angular-auth2-client-4201',
  resourceServerBaseUrl: 'http://187.127.142.16:9090',
  scope: 'openid profile notes.read notes.write',
  turnstileSiteKey: '',
};
