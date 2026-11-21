export const GOOGLE_AUTH_PROJECT_ID = 'supermeapp-74589';
export const GOOGLE_AUTH_PROJECT_NUMBER = '124581866222';
export const GOOGLE_AUTH_WEB_CLIENT_ID = '124581866222-gblqv0k2a75uo4183ahl0u8336nbcsku.apps.googleusercontent.com';
// iOS OAuth client ID from GoogleService-Info.plist — used as GIDConfiguration.clientID
export const GOOGLE_AUTH_IOS_CLIENT_ID = '124581866222-gsff4sl4ff07rr4btsah7u91gtkh30n0.apps.googleusercontent.com';
export const GOOGLE_AUTH_ANDROID_DEV_CLIENT_ID = '124581866222-kgg99hqv2fcmac8rfra4mslsuqcb40kq.apps.googleusercontent.com';
// com.superme.app, Google Play app-signing SHA-1 DD:2E:40:0A:...:C8:DA.
export const GOOGLE_AUTH_ANDROID_PLAY_CLIENT_ID = '124581866222-8gsv2hulumvhmta5sajs2rg0kv22l9vr.apps.googleusercontent.com';

export function isTrustedAndroidGooglePresenter(clientId: unknown, production: boolean): boolean {
  return clientId === GOOGLE_AUTH_ANDROID_DEV_CLIENT_ID
    || (production && clientId === GOOGLE_AUTH_ANDROID_PLAY_CLIENT_ID);
}
export const GOOGLE_AUTH_SCOPES = ['profile', 'email'];

export const GOOGLE_AUTH_INIT_OPTIONS = {
  clientId: GOOGLE_AUTH_WEB_CLIENT_ID,
  scopes: GOOGLE_AUTH_SCOPES,
  grantOfflineAccess: false,
};

export const GOOGLE_AUTH_CAPACITOR_CONFIG = {
  clientId: GOOGLE_AUTH_WEB_CLIENT_ID,
  iosClientId: GOOGLE_AUTH_IOS_CLIENT_ID,
  scopes: GOOGLE_AUTH_SCOPES,
  forceCodeForRefreshToken: false,
};
