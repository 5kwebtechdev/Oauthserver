# Firebase Services Setup

This app now has code-level integration for Remote Config, App Check, App Distribution, and deep links.

## Remote Config

Runtime defaults live in `src/environments/environment*.ts` under `firebase.remoteConfig.defaults`.
Firebase Console values override those defaults after `RemoteConfigService.initialize()` runs at app startup.

Use `RemoteConfigService` in Angular code for feature flags and dynamic values:

```ts
this.remoteConfig.isFeatureEnabled('academy_enabled', true);
this.remoteConfig.getString('minimum_supported_version', '0.0.2');
```

## App Check

Android native App Check is configured with:

- Debug provider for debug builds
- Play Integrity provider for release builds
- `X-Firebase-AppCheck` header on backend calls to `environment.apiUrl`

For web/iOS WebView fallback, set `firebase.appCheck.recaptchaSiteKey` in the Angular environment after creating a Web App Check provider in Firebase Console.

Firebase Console setup still required:

- Register the Android app with Play Integrity
- Register SHA certificates for all signing keys
- Add debug App Check tokens printed by debug builds when testing locally
- Enforce App Check on Firebase products only after valid tokens are confirmed
- If the backend validates `X-Firebase-AppCheck`, verify tokens server-side using Firebase Admin SDK

## App Distribution

Android App Distribution uses the official Gradle plugin. Local upload command:

```bash
cd android
./gradlew appDistributionUploadRelease
```

Supported Gradle properties or environment variables:

- `FIREBASE_APP_ID`
- `FIREBASE_TESTERS`
- `FIREBASE_GROUPS`
- `FIREBASE_RELEASE_NOTES`
- `FIREBASE_RELEASE_NOTES_FILE`
- `FIREBASE_SERVICE_CREDENTIALS_FILE`
- `FIREBASE_APP_DISTRIBUTION_ARTIFACT_TYPE`

The GitHub workflow expects these secrets when CI distribution is enabled:

- `FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_TESTERS` or `FIREBASE_GROUPS`

## Deep Links

Firebase Dynamic Links is shut down, so this app uses Android App Links, iOS Universal Links, and a `superme://` fallback scheme.

Supported shared links include:

- `https://supermeapp.com/academy`
- `https://supermeapp.com/academy/subject?categoryId=12`
- `https://supermeapp.com/academy/course/123`
- `https://supermeapp.com/product/123`
- `superme://academy/course/123`

Angular link generation is available through `DeepLinkService.createLink(...)`.

Domain setup still required:

- Host Android `assetlinks.json` at `https://supermeapp.com/.well-known/assetlinks.json`
- Host iOS `apple-app-site-association` at `https://supermeapp.com/.well-known/apple-app-site-association`
- Update the iOS bundle identifier from the Capacitor default before final Universal Link verification
- Ensure Apple Associated Domains capability is enabled for the app identifier
