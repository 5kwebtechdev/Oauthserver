# Native Google sign-in for Android DEV

This contract is limited to `supermeapp-dev-android` on the DEV auth server. It does not change website Google sign-in or production OAuth clients.

## Native button action

The hosted Android login page renders a Google button that links to the exact URI `superme://oauth/dev/google`. Android must intercept this action and launch the native Google SDK. The URI contains no credentials or tokens. Return the Google ID token to the application in memory and send it to the backend over HTTPS in the JSON request below. Do not add a JavaScript bridge or put a Google ID token in a URI.

## Google client claims

- Android package: `com.superme.app`
- Google ID-token `aud`: `124581866222-gblqv0k2a75uo4183ahl0u8336nbcsku.apps.googleusercontent.com`
- Expected `azp`: `124581866222-kgg99hqv2fcmac8rfra4mslsuqcb40kq.apps.googleusercontent.com`
- Android signing SHA-1: `546a1c3bbea4de454ab538afa5e2e25cd512fc5c`
- Android signing SHA-256: `67243057a7c5d32387fd805fac14fc368e6ef10d141f9ac4462f88e0d69f6aa2`

The server checks signature through Google's configured JWKS decoder, accepted issuer, expiration/not-before, the exact single audience, authorized party, Google nonce, and verified email. It never trusts an email by itself. The actual `aud`/`azp` values must still be confirmed with a native SDK token during device integration.

## Get a short-lived OAuth code

`POST https://auth.supermeapp.com/v1/auth/android-dev/google`

Headers: `Content-Type: application/json`, `Accept: application/json`.

```json
{
  "googleIdToken": "<Google ID token>",
  "clientId": "supermeapp-dev-android",
  "redirectUri": "superme://oauth/dev/callback",
  "codeChallenge": "<base64url(SHA-256(code_verifier))>",
  "codeChallengeMethod": "S256",
  "googleNonce": "<same nonce sent to Google native SDK>",
  "oidcNonce": "<app-generated OIDC nonce to validate in our ID token>",
  "turnstileToken": "<fresh response from the DEV Turnstile widget>"
}
```

The backend verifies Turnstile server-side and fails closed with `503 bot_protection_unavailable` if the DEV secret is missing, or `401 captcha_failed` for a missing/invalid/expired response. The hosted page keeps its Turnstile widget enabled; the frontend must pass its fresh response in this HTTPS body field when starting native Google sign-in.

Success is `200`, `Cache-Control: no-store`:

```json
{"code":"<single-use authorization code>","expires_in":60}
```

Google ID token, code verifier, and code are never written to server logs or URLs. The authorization code is random, bound to the Android client, registered callback and S256 challenge, expires after 60 seconds, and is single use. A nonce already used to redeem a Google identity is rejected, including across server instances.

## Exchange code for tokens

`POST https://auth.supermeapp.com/oauth2/token`, form URL encoded, no client secret:

```text
grant_type=authorization_code
&client_id=supermeapp-dev-android
&redirect_uri=superme%3A%2F%2Foauth%2Fdev%2Fcallback
&code=<returned-code>
&code_verifier=<original-verifier>
```

The standard token response contains `access_token`, `refresh_token`, `id_token`, `token_type`, and `expires_in`. The ID token's `nonce` is the exact `oidcNonce` sent in the JSON request. Android client policy remains 15-minute access tokens and 7-day rotating refresh tokens, with refresh-token reuse detection enabled. Persist the returned token set atomically in Android's existing Keystore-backed storage.

## Existing users and onboarding

The endpoint reuses the existing Google account lookup/linking and active-account checks, restricted explicitly to the DEV user repository. A valid Google identity without an existing SuperMe account receives `409 registration_required`, with the verified identity fields that can prefill onboarding and required fields (`gender`, `dateOfBirth`, `relationship`). No OAuth code or tokens are issued for an unregistered account. Continue through the existing DEV onboarding/registration flow; after the account is created, request native Google sign-in again. A deleted, disabled, or otherwise unusable account receives `401 unusable_account`.

## Errors

Errors are JSON `{ "error": "...", "error_description": "..." }`, with `Cache-Control: no-store`:

| HTTP | `error` | Meaning |
| --- | --- | --- |
| 400 | `invalid_request`, `invalid_client`, `invalid_redirect_uri`, `invalid_pkce` | Fix request/configuration and start a new attempt. |
| 401 | `invalid_google_credential` | Google token validation failed; obtain a fresh native Google credential. |
| 401 | `unusable_account` | Account is disabled/deleted or cannot authenticate. |
| 409 | `registration_required` | Finish existing DEV onboarding, then start sign-in again. |
| 409 | `google_token_replayed` | Google nonce was previously used; start a new Google sign-in. |
| 429 | `too_many_requests` | Wait according to rate limit, then retry with a fresh sign-in attempt. |
| 503 | `client_not_ready`, `google_client_not_ready` | DEV server configuration is incomplete; do not retry in a tight loop. |

## Logout

Use the existing DEV logout flow: revoke the current refresh token with `POST https://auth.supermeapp.com/oauth2/revoke` (`token=<refresh_token>&token_type_hint=refresh_token&client_id=supermeapp-dev-android`), then call `/android-dev-logout` with the current authorization's `id_token_hint`; the server redirects only to registered `superme://oauth/dev/logout`. Do not send a stale ID token hint. The browser SSO cookie is separate from the native token set; native logout should also clear local Keystore tokens and handle the app callback.

## Verification status

Automated integration tests exercise code issuance, standard code + PKCE token exchange without a client secret, matching OIDC nonce, refresh rotation, and old-refresh-token reuse rejection. Unit tests cover Google JWT claim validation, replay protection, and the Android-only login page button. A real Google native ID token, device login, wrong-audience/expired token against Google's live keys, and deployed DEV test still require the FE/device test run.
