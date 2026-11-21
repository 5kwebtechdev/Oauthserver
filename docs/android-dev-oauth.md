# DEV Android OAuth handoff

Only Android builds made with Angular `auth2-dev` configuration enable the native OAuth branch. Website remains on supermeapp-dev-web; production and iOS retain their existing auth behavior.

Backend registration required:
- ANDROID_DEV_OAUTH_CLIENT_ID=supermeapp-dev-android
- ANDROID_DEV_OAUTH_REDIRECT_URIS=superme://oauth/dev/callback
- ANDROID_DEV_OAUTH_POST_LOGOUT_REDIRECT_URIS=superme://oauth/dev/logout

Frontend implements exact callback dispatch, persisted PKCE/OIDC transaction storage, library state/nonce validation, duplicate callback suppression, hosted authorization through Capacitor Browser, token exchange, native secure-session persistence and existing onboarding/dashboard routing. Existing manifest accepts the superme scheme. No client secret is used. Cold launch is read using App.getLaunchUrl; warm launch uses appUrlOpen. Non-auth deep links retain their existing routing.

Refresh is single-flight; app resume and a foreground interval check expiry. Updated tokens are flushed to secure storage before queued requests continue. Confirmed invalid_grant requires login. Temporary failures preserve local session. An ambiguous network/server refresh result blocks blind token reuse until a fresh login. Existing native periodic session checks accept a session pending refresh rather than treating access expiry alone as logout.

Logout uses the DEV android-dev-logout endpoint in the browser; omitted ID-token hints are allowed per backend contract, but cannot revoke an authorization. Browser SSO logout can affect other clients sharing that browser session. Access tokens may remain valid until expiry.

Validation: 26 focused auth/callback/interceptor tests passed; Android Java compilation passed; auth2-dev Angular build passed (existing Sass warnings). Real device login/refresh/logout, callback return and CORS compatibility remain pending backend registration and a DEV APK test. No production deployment, APK delivery or claim of end-to-end success.

## First-launch startup correction

The generic startup catch previously labelled all Angular/bootstrap failures as secure-storage failures. DEV native startup also awaited network discovery before rendering Login. Discovery is now deferred until authorization/callback/refresh, and an empty first-install session does not generate an unnecessary encrypted write. Diagnostics distinguish STARTUP-STORAGE from STARTUP-APP without exposing token values. 30 focused storage/auth/callback tests passed. The reported phone's exact underlying exception is not available; these checks do not prove its root cause. Emulator launch could not proceed because its userdata partition requires more free disk space. Phone confirmation remains required.

## Confirmed STARTUP-APP root cause and regression

Reproduced the distributed DEV web bundle in a headless browser with an Android Capacitor bridge simulation and empty secure storage. Angular reported TypeError: Cannot read properties of undefined (reading 'startsWith'), originating in the secure-storage key predicate called by AuthService.getCurrentSession during its constructor field initialization. AuthService's storage-key constants were declared after the BehaviorSubjects that read them. Raw browser Storage coerces undefined keys to strings; the adapter did not.

Moved session constants before dependent subjects and added DOM-compatible key coercion to the adapter. The same reproduction then rendered first-launch onboarding without STARTUP-APP or the TypeError. Added undefined-key regression test; 31 focused tests passed. Added DEV-native /callback routing for successful PKCE return. This is simulated-bridge startup verification, not a real-device OAuth test.

## Single hosted credential entry

The recording showed native local credential entry followed by the hosted credential form. DEV-native loginAfterRegistration deliberately opens browser authorization instead of transferring credentials across separate cookie jars, so collecting a local password first was redundant. DEV Android /login and /home/login now enter PkceEntry directly, opening hosted sign-in once. Production, website and iOS routes remain unchanged. Browser cancellation exposes retry, and loggedOut=1 prevents automatic authorization reopening after logout.

33 focused auth/entry/callback/interceptor tests passed. A headless Android-bridge simulation of the final DEV bundle confirmed zero local password inputs and exactly one Browser.open request with client_id=supermeapp-dev-android, redirect_uri=superme://oauth/dev/callback and code_challenge_method=S256. Public discovery/JWKS responses were supplied to the simulation; no real user credentials or tokens were used. Real-account phone login/return remains to be tested.

## Native credential form with Turnstile (current implementation)

DEV Android /login now uses the original LoginComponent; only /callback uses PkceEntry. The DEV public Turnstile site key is configured in environment.auth2-dev.ts. A fresh execution token is obtained before sending credentials. The library generates random PKCE verifier/challenge, state and nonce. Its authorization-URL callback is intercepted for this credential operation rather than opening a browser. POST /v1/auth/android-dev/login?client_id=supermeapp-dev-android carries the agreed JSON body. State is checked before a single standard authorization-code exchange. Native token response writes are staged until validation succeeds, then committed and flushed to the encrypted session. Revocation sends the refresh token in a form body before Android logout. Existing post-signup authorization remains the hosted flow when no login-form proof exists.

36 focused tests and DEV Angular build passed. No real credentials/token exchange performed. No new test APK delivered for this revision yet.

Backend compatibility blocker found in origin/main f2b56fec: AndroidDevNativeLoginController creates the authorization request with code_challenge and code_challenge_method but no nonce. Existing FE code checks ID-token nonce. Since this FE uses the same generated random value for state and nonce (no additional user state), backend must include `"nonce", request.state()` in authorizationRequest.additionalParameters so the initial ID token and refreshed ID tokens retain that nonce. Do not disable client nonce validation. Confirm Turnstile widget allows localhost. End-to-end validation and a phone test remain pending these checks.

## DEV nonce contract update — 2026-11-03

Supersedes the state-echo contract and compatibility blocker above. Backend reports DEV deployment 2e58ada7. The credential request now sends the OAuth library-generated `nonce`; it sends no `state`. The response requires only a nonempty code and positive expires_in. The locally generated state remains local and is passed to the library's code-flow handler so its saved PKCE verifier and nonce validation remain intact. ID-token validation failures discard staged token writes without publishing a session. No nonce-check bypass was added.

TypeScript and 37 focused auth/storage/interceptor tests passed. Real-device Turnstile, credential login, refresh rotation and logout still require end-to-end testing; no real credentials were used during automated checks. Website and production configuration are unchanged.

DEV Angular and Android assembleDebug builds passed. APK signature and packaged DEV URLs/client/callbacks/SecureSession registration verified. Artifact: artifacts/dev-android-20261103/SuperMe-DEV-NativeLogin-Nonce-20261103.apk (213,117,643 bytes; SHA-256 bd4e9749a52eba8e1008be8894c96637a7909060e6b7881654bea73ac261431e). Debug-signed test build, version 0.1.19 (52); not a Play release. Real-device end-to-end login remains pending.

## Hosted Android OAuth — current flow (supersedes native credential form)

Per the updated requirement, DEV Android /login and /home/login now route to PkceEntry and open backend OAuth authorization in Capacitor Browser (Android Custom Tabs). The native JSON credential-login endpoint is no longer called. Turnstile and credential entry belong to the hosted auth page. Production/web/iOS routing remains unchanged.

The OAuth library generates PKCE S256 and the OIDC nonce. A separate 32-byte cryptographic random browser state replaces its nonce-based URL state. The state and original library state are persisted through the Keystore-backed adapter before opening the tab. Callback state must match before any token request; only then is the library state restored internally for its PKCE and ID-token nonce checks. Pending state is consumed once. Refresh rotation, secure token persistence and revoke-before-Android-logout remain in place. Device login/return/refresh/logout still require end-to-end testing.

Hosted-flow verification: 36 focused tests passed, including independent browser state, rejected callback state, single callback redemption, revocation and secure storage. DEV Angular build passed and final bundle contains the protected callback-state key and Android client, with no native credential endpoint. No new APK or production deployment was performed for this revision.

Fresh hosted-login DEV APK generated: artifacts/dev-android-20261103/SuperMe-DEV-HostedOAuth-Latest-20261103.apk. Android assembleDebug and signature verification passed; packaged client, DEV URLs, callback state and absence of native JSON login endpoint verified. Device end-to-end testing remains pending.

## In-app hosted WebView — current DEV transport

Supersedes the Custom Tab transport above. AuthWebViewPlugin launches a non-exported, standalone Android Activity containing a platform WebView, not a Capacitor WebView. No JavaScript interfaces, script injection, console logging or user-agent spoofing are installed. PKCE, independent state, nonce validation and Keystore persistence remain in PkceAuthService. Exact callbacks are returned as native Activity results and never intentionally loaded as pages.

Top-level hosts: auth.supermeapp.com, accounts.google.com, appleid.apple.com. Resource hosts additionally include challenges.cloudflare.com, fonts.googleapis.com, fonts.gstatic.com, www.gstatic.com and ssl.gstatic.com, based on the hosted login and provider resources. No wildcard domains. New windows and permissions are denied; file/content access and mixed content are disabled; TLS errors cancel and close the screen. Android Capacitor logging is disabled because plugin parameters may contain callback URLs/ID-token logout hints. Logout uses the same WebView cookie context after refresh-token revocation. Website/production/iOS OAuth transport is unchanged.

Known limits: Google OAuth disallows embedded user agents (https://developers.google.com/identity/protocols/oauth2/policies); no workaround or user-agent spoofing is included. Hosted sign-up and forgot-password links currently leave auth.supermeapp.com for devapk.supermeapp.com and are intentionally blocked by the requested navigation policy. Supporting those links needs auth-hosted pages or an agreed explicit destination policy. Real-device credential login, Turnstile, provider behavior, cancellation, TLS error, callback and logout testing remain pending. Six native URL-policy tests and 36 focused frontend tests passed.

DEV WebView APK: artifacts/dev-android-20261103/SuperMe-DEV-HostedWebView-20261103.apk. Angular auth2-dev build, Android debug build, six native URL-policy tests and 36 focused frontend tests passed. APK signature and packaged AuthWebView Activity/plugin, SecureSession, DEV client and logging-disabled config verified. Real-device end-to-end testing remains pending.

## Login presentation update — 4 November 2026

Removed the native Close sign in header; Android Back remains supported. Native PKCE entry hides progress prose and uses SupermeLoadingComponent. While the hosted auth page loads, a separate JavaScript-disabled, network-blocked local WebView displays the exact existing loader markup/styles exported by scripts/export-auth-loader.mjs from SupermeLoadingComponent (no independently designed spinner). The loader hides on page commit. The Capacitor copy hook regenerates this asset automatically.

User explicitly selected keeping all authentication in-app and requesting backend/native Google support. The hosted Google Identity Services popup cannot complete in this restricted WebView. Popup attempts now receive a clear native explanation rather than silent rejection; native Google authentication is not claimed fixed. The DEV backend/native integration request is docs/dev-native-google-backend-request.md. No user-agent spoofing, script injection or JavaScript bridge was added. 43 focused frontend tests passed; the exported loader was rendered at 390x844 with JavaScript disabled, showing four existing coloured shapes and no text.

Updated DEV APK built and signature verified: artifacts/dev-android-20261104/SuperMe-DEV-LoginUI-20261104.apk. Six native policy tests and Android assembleDebug passed. Packaged APK verified: existing four-colour CSS loader, no native Close sign in text, and explicit popup feedback. Google authentication still needs the requested DEV native backend support; no claim of successful Google device login.

## Signup and nested-login routing fix — 4 November 2026

Reviewed the two recordings. The hosted signup link targets https://devapk.supermeapp.com/, which the strict auth WebView policy rejected and surfaced as a generic sign-in error. Exact, user-initiated DEV account links now return a fixed native app route through Activity results: /, /signup and /sign-up map to /signup; /forgot-password maps to /forgot-password. These pages are not loaded in the auth WebView. Unknown/spoofed hosts and paths remain blocked. Abandoned OAuth state is cleared before changing to the account screen. Automatic cross-host redirects are not treated as account-link taps.

The Home lazy module retained a separate LoginComponent route; it now selects PkceEntryComponent for DEV Android just like the root login route. User confirmed keeping the registration form and using hosted login for all Login links. Role selection/registration behavior remains intact.

User explicitly confirmed that the backend native Google exchange is not implemented and has no endpoint contract. Google support remains pending; the current notice is intentional, and no provider-policy workaround was added. 46 focused frontend tests passed, including local signup handoff, invalid route rejection and existing OAuth callback dispatch. Seven native policy tests passed.

New DEV APK: artifacts/dev-android-20261104/SuperMe-DEV-SignupRouting-20261104.apk. Build, seven native policy tests and signature verification passed. Packaged app-route handoff and existing loader verified. Real-device verification of this revision remains pending.

## Logout white-screen fix — 4 November 2026

Reviewed Record_2026-11-04-12-13-28.mp4: the profile logout is followed by a persistent blank screen. Code cleared the signed-in UI and deferred navigation while waiting for push and Google/Firebase SDK cleanup without a deadline. Native Google cleanup initialized the SDK even for hosted-password sessions. The logout WebView also hid its loader on page commit, even though logout should only wait for its custom-scheme redirect.

Native logout now navigates to /login?loggedOut=1 after local token clearing, before optional SDK cleanup. Optional cleanup waits at most 2.5 seconds and does not initialize Google on native logout unless it was already initialized. Refresh-token revocation is preserved. Hosted logout uses one final route transition, validates its expected callback, keeps the existing SuperMe loader visible, and closes with a 12-second deadline if no callback arrives. Native callback completion is marked before stopLoading to avoid error-callback races overriding Activity results.

49 focused frontend tests passed, including stalled cleanup, hosted logout failure and single callback handling. Device testing of this revision remains pending; no real user token was used in local checks.

Final logout revision: native logout URL no longer depends on cached discovery after restart. 50 focused frontend tests and seven native policy tests passed; DEV Angular build, Android assembleDebug and APK signature verification passed. Fresh artifact: artifacts/dev-android-20261104/SuperMe-DEV-LogoutFix-20261104.apk. Packaged logout deadline and existing loader verified. Real-device retest remains pending.

## DEV native Google integration — 4 November 2026

The hosted Android login's exact `superme://oauth/dev/google` action now opens the native Credential Manager Google account picker. An app-owned Turnstile modal obtains a fresh proof before the HTTPS Google exchange. Separate Google and SuperMe nonces, PKCE, existing callback state validation and secure token storage remain in use. The Google exchange code is redeemed through the existing OAuth library. No credentials or CAPTCHA are extracted from the hosted page; no bridge or scripts were added there. New-account responses enter existing registration with required profile fields; Google proof remains in memory. Website, production and iOS flow selection is unchanged.

Public DEV Turnstile key: `0x4AAAAAAFy7PP8fwWp7IphF`. Backend confirms matching secret configured, but **Cloudflare owner still must allow hostname `localhost` on this same widget**, retaining `auth.supermeapp.com`. Until then the app-owned security check fails closed and Google login cannot succeed. No secret belongs in the app.

Validation: 62 focused frontend tests passed; auth2-dev Angular build passed. Real-device Turnstile, Google aud/azp, existing/new-user login, refresh and logout remain pending; no device connected during build. No production deployment performed.

Fresh DEV debug APK: `artifacts/dev-android-20261104/SuperMe-DEV-NativeGoogle-20261104.apk`, 216,756,837 bytes (216.76 MB), SHA-256 `ccece533a2917b8a2a9bd910ac574d8ed32aab9d25dc2120d03c22e7621a2298`. Android assembleDebug and all 12 native unit tests passed (including 8 auth navigation policy tests). APK signature matches the backend-provided Android SHA-1/SHA-256. Packaged JavaScript contains the DEV client, confirmed widget key, native Google plugin and exchange endpoint. This is a DEV debug test build, not a production/Play release. Successful device login remains blocked by the external localhost allowlist setting described above.

## Logout returns to backend-hosted sign-in — 4 November 2026

After the native logout Activity returns (including timeout/error), the app now explicitly starts the existing hosted authorization flow. Previously it only navigated to `/login?loggedOut=1`; that route deliberately paused sign-in, and Ionic can retain the already-mounted component without rerunning initialization. The explicit start removes that dependency and preserves server revocation, local clearing, PKCE, state/nonce and the existing SuperMe loader. Failed connection to sign-in leaves a retryable signed-out error. No website or production flow changed.

63 focused frontend tests passed, including successful logout callback, logout timeout and reopening-login failure. DEV Angular build passed. Real-device retest remains pending.

## DEV hosted Google Turnstile handoff — 4 November 2026

Native Google now initiates `/v1/auth/android-dev/google/turnstile` with the saved PKCE challenge, independent state, Google nonce and OIDC nonce. Only the exact HTTPS auth-hosted `/android-dev/google-security` URL for the returned transaction is opened in the restricted auth WebView. The callback must match the registered Android callback and saved state and contain exactly one handoff ticket. No hosted page scripts or token extraction are used.

After verification, the native Google SDK receives the saved Google nonce. The Google ID token and ticket are posted only in the body to `/v1/auth/android-dev/google/exchange`. The returned code uses the existing PKCE token exchange, OIDC nonce validation and secure token storage. Failed/cancelled attempts discard local context and best-effort cancel the server transaction; tickets are never retried. The app-owned localhost CAPTCHA is no longer used for native Google.

Validation: TypeScript check passed; 65 focused frontend tests passed; Android unit-test build passed, including the hosted URL allowlist tests. Real-device Turnstile completion, native Google login, refresh and logout still require device verification. These changes are local only, with no production deployment or new APK generated in this step.
