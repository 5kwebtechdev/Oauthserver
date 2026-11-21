DEV Android — native Google login support needed

Keep this DEV-only. The app uses client supermeapp-dev-android, PKCE S256, redirect superme://oauth/dev/callback, separate state/nonce, and Keystore token storage. Email/password and Turnstile remain on the backend-hosted page inside a restricted Android WebView.

Google Identity Services currently opens a popup. The app blocks unrestricted popup windows, and Google prohibits OAuth inside embedded WebViews. We will keep everything in-app and use a supported native Google sign-in SDK; do not spoof the user agent or bypass Google restrictions.

Please inspect the existing Google login implementation and confirm/implement a native Google-to-Android-OAuth code exchange:

1. Agree the endpoint and exact request/response with FE before wiring it. Existing /api/auth/google-login establishes a browser-cookie session; confirm whether it can securely issue a PKCE-bound code for the Android client, or implement a separate DEV exchange.
2. Accept a Google ID token obtained by the approved native SDK, the Android client ID, exact registered redirect, S256 challenge, and OIDC nonce. Confirm the allowed Google OAuth client IDs/audiences for the DEV native app. No client secret in Android.
3. Validate Google's token signature, issuer, audience/authorized-party, expiry and applicable nonce/replay protections. Preserve existing account lookup/linking, blocked-user and onboarding rules. Never use email alone as proof.
4. Return a short-lived, single-use authorization code, bound to this Android client, redirect URI and PKCE challenge. Persist the submitted OIDC nonce so the OAuth ID token includes it. Document expiry, replay, error, signup/onboarding and rate-limit behavior.
5. FE will exchange that code at /oauth2/token with the saved verifier, then validate the ID token and save the token set in Keystore. Keep Android 15-minute access / 7-day rotating refresh policy and current logout/revocation behavior.
6. Agree how the hosted page requests native Google sign-in without a JavaScript bridge or injected scripts. Options include an exact allowlisted app-action link handled by the existing native URL interceptor, or an app-owned native Google button. Do not guess the route or payload; confirm a minimal signal that contains no credentials/tokens and resumes the existing pending PKCE transaction.
7. If needed, use the authorized OAuth request's Android client context to hide/replace the unsupported hosted Google popup for Android only. Preserve website Google login and its existing token lifetime. Do not apply user-agent spoofing or weaken Turnstile/security on other flows.

Please return the final endpoint contract, Google client configuration required by Android, native-action signal, and DEV deployment confirmation. Do not change production.
