# Production Android origin

Prepare production Android web assets and sync with the required origin using:

```sh
npm run android:prepare:production
```

This builds production web assets, syncs Android and checks its hostname. For a manual sync after a production build, use:

```sh
SUPERME_ANDROID_PRODUCTION=true npx cap sync android
```

This sets the bundled Capacitor origin to `https://app.supermeapp.com`.
DEV Android sync and iOS sync must omit this flag to retain their current origin.
The hostname serves bundled assets; it does not set a remote `server.url`.

Backend must allow this exact production origin on discovery, JWKS, token,
revocation and Android Google exchange endpoints before device login testing.

Changing the WebView origin changes its browser-storage namespace. Existing
Keystore-backed SecureSession storage is separate, but sessions and onboarding
state must be verified after upgrading from a localhost-origin APK.

CORS is a browser access policy, not proof of app identity. Continue enforcing
PKCE, token validation and the existing server-side security checks.
