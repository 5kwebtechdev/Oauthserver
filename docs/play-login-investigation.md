# Play-distributed login failure investigation

## Evidence

- The supplied screenshot displays the error thrown by `ensureNativeDiscovery()` when OIDC discovery or JWKS loading fails, before opening the hosted credential page.
- The video also shows the generic login-entry catch, which does not expose the underlying exception. These messages alone cannot distinguish network, CORS, or discovery validation failures.
- Current production settings use `https://sso.supermeapp.com` and native client `supermeapp-dev-android`.
- `capacitor.config.ts` sets the production Android origin only when `SUPERME_ANDROID_PRODUCTION=true` is supplied during sync. Omitting it falls back to Capacitor's default hostname.
- Live probes during this investigation: production discovery with Origin `https://app.supermeapp.com` returned 200; Origin `https://localhost` returned 403.
- Current generated native config contains the correct `https` scheme and `app.supermeapp.com` hostname. It is not evidence of the config packaged in the failed uploaded AAB.
- Release shrinking is enabled; Capacitor's consumer ProGuard rules preserve plugin classes and annotated callbacks. No missing keep rule has been established.
- Firebase App Check is attached to the business API host, not SSO discovery, so it is not currently implicated in this discovery failure.

## Prevention implemented

`validateReleaseWebAuth` now runs before `preReleaseBuild`. It rejects missing web assets, and rejects production SSO bundles with an incorrect origin or a remote server URL. Local validation passed.

Production preparation must include:

```sh
npx ng build --configuration production --base-href /
SUPERME_ANDROID_PRODUCTION=true npx cap sync android
```

## Confirmed version 57 cause

The user supplied `/Users/vivek5kwt/Downloads/57.aab`, downloaded as the original file from Play Console for 0.1.25 (57). Its `base/assets/capacitor.config.json` has neither `server.hostname` nor `server.androidScheme`. Capacitor Android defaults the hostname to localhost. Its main JavaScript includes production SSO and the production API, together with the Android OAuth client. The working `SuperMe06112026.apk` instead bundles `hostname: app.supermeapp.com` and `androidScheme: https`. Live discovery probes again returned 403 for localhost and 200 for app.supermeapp.com. This establishes the origin/configuration mismatch in the uploaded artifact; Google Play did not introduce it.

Use `npm run android:prepare:production` before generating a signed release. This command builds the production frontend, syncs with the production-origin flag, and verifies the generated config. The Gradle release guard independently blocks the mismatched combination.

## Replacement verification

Obtain the exact failed AAB and its Play version code. Inspect `base/assets/capacitor.config.json` and packaged JavaScript, then compare them with the working APK. If its origin is localhost, the observed 403 establishes the configuration mismatch. Otherwise collect a sanitized network failure from the Play-installed release to distinguish connectivity, discovery/JWKS validation, and native launch failures. Never collect credentials, tokens, authorization codes, or complete callback URLs.

Validate the replacement through Play internal testing, including upgrading an existing installation. Sideloading a debug APK alone does not verify the Play-distributed release. Do not treat this investigation as confirmation that the incident is resolved.
