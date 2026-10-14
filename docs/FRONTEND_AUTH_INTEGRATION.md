# Integration instructions for the real frontend / APK agent

Implement authentication against this backend as an OAuth 2.0 / OpenID Connect
public client using Authorization Code + PKCE S256. The Angular demo is an example,
not a required deployment dependency. The real application owns its UI, callback,
token exchange, token storage, and authenticated API requests. The backend owns
the password login page, credential verification, browser session, authorization
codes, token issuance, and JWT signing keys.

This document describes the CURRENT backend. Do not invent endpoints or assume
the account APIs return authorization codes. No application code was changed for
this guide.

## Addresses and registration

Current development issuer: `http://187.127.142.16:9000`.
Current demo resource API: `http://187.127.142.16:9090`.
Discovery: `GET /.well-known/openid-configuration` on the issuer.
Get authorization, token, userinfo, logout, and public-key URLs from discovery.
Use HTTPS addresses for the real app; the HTTP IP addresses are deployment-test
settings, not production mobile authentication settings.

The demo uses `pkce-angular-auth2-client-4203` and
`http://187.127.142.16:4203/callback`. A real app needs its OWN registered client
ID and EXACT redirect URI. Do not ship the demo client/callback in an APK.
For example, an Android app might register a verified HTTPS App Link, or a
reverse-domain custom scheme such as `com.example.superme:/oauth2redirect`.
That is an example, not a callback already registered on this server.
Configure the manifest, intent handling, and server registration to agree.

The current startup seeder creates one configured public client and requires PKCE.
It allows `openid profile notes.read notes.write`, authorization-code and refresh
grants, and uses no client secret. Set `OAUTH_CLIENT_ID`, comma-separated
`OAUTH_REDIRECT_URIS`, and `OAUTH_POST_LOGOUT_REDIRECT_URI` for a new client and
restart the auth server. Existing IDs are NOT updated by changing these values.
To retain demo and real clients concurrently with separate settings, register
both in the RegisteredClientRepository; there is no public client-registration
API in this project. The `notes.*` scopes and `pkce-resource-server` audience are
for this demo resource API: the real business API must independently be configured
to validate the auth server's JWT issuer, signature, expiry, audience, and scopes.

## Responsibility boundaries

| Task | Owner / behavior |
| --- | --- |
| Password login screen | Backend `GET /login`; open through authorization flow |
| Password submission, CSRF and login errors | Backend browser page |
| Generate PKCE verifier/challenge, state and nonce | Real app / OAuth library |
| Handle callback and exchange code | Real app |
| Store tokens, refresh and attach bearer token | Real app |
| Forgot-password and registration screens | Real app; call APIs below |
| Google sign-in UI | Can be backend page or real app; session constraints below |
| Verify Google identity, OTP and registration data | Backend |
| Signing private/public PEM keys | Backend filesystem only |

## Required login and separate token exchange

1. Generate a fresh cryptographically random `code_verifier` for every attempt
   (43–128 unreserved characters). Keep it privately in the pending login state.
   Calculate `code_challenge = base64url(SHA256(ASCII(code_verifier)))`, without
   padding. Independently generate random `state` and OIDC `nonce`.
2. Save the pending state, verifier, nonce, exact redirect URI, and creation time.
   For web applications keep it across navigation; for Android retain it across
   activity recreation/process lifecycle using appropriately protected storage.
   Prefer a maintained OAuth implementation instead of custom cryptography.
3. Navigate the browser to the authorization endpoint. Do not fetch it as JSON:

   ```text
   GET /oauth2/authorize
     ?response_type=code
     &client_id=YOUR_REGISTERED_CLIENT_ID
     &redirect_uri=URL_ENCODED_EXACT_REDIRECT_URI
     &scope=openid%20profile%20notes.read%20notes.write
     &state=RANDOM_STATE
     &nonce=RANDOM_NONCE
     &code_challenge=PKCE_CHALLENGE
     &code_challenge_method=S256
   ```

4. If unauthenticated, the backend redirects to its HTML `/login` page. The user
   enters credentials there. `POST /login` normally answers with HTTP 302, not
   JSON tokens and not a JSON code. Its success resumes the saved authorization
   request. The authorization endpoint then redirects to the registered app:

   ```text
   YOUR_REDIRECT_URI?code=SHORT_LIVED_ONE_TIME_CODE&state=ORIGINAL_STATE
   ```

   If the user opened `/login` directly without `/oauth2/authorize`, there may be
   no pending authorization to resume, and login goes to `FE_BASE_URL`. That is
   why the real app must START at `/oauth2/authorize`.
5. At the callback, handle `error` responses, require the matching saved `state`,
   and reject missing/unexpected state or missing pending verifier. Do not treat
   a redirect or code alone as completed authentication.
6. Make the SEPARATE token request from the app:

   ```http
   POST /oauth2/token HTTP/1.1
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code&client_id=YOUR_CLIENT_ID&code=RETURNED_CODE&redirect_uri=EXACT_REDIRECT_URI&code_verifier=ORIGINAL_VERIFIER
   ```

   Encode with a form encoder, not string concatenation. Do not send JSON,
   username/password, client secret, or a Google token to this endpoint. The
   redirect URI must be the same one used in the authorization request.
7. On success, save the tokens and discard the pending verifier/state. The code
   is single-use: do not retry an already exchanged code or execute the exchange
   twice when the callback view/activity initializes twice.

   ```json
   {
     "access_token": "...",
     "token_type": "Bearer",
     "expires_in": 600,
     "refresh_token": "...",
     "id_token": "...",
     "scope": "openid profile notes.read notes.write",
     "user": {}
   }
   ```

   The `user` extension is the backend's user payload when available, not an
   authorization-code response. Preserve the OIDC fields too. Validate ID-token
   signature, issuer, audience and nonce with the OAuth/OIDC library. Use the
   access token, not the ID token or Google ID token, for business APIs.

## Refresh, API access and logout

Use `Authorization: Bearer ACCESS_TOKEN` on protected API calls. The demo
`GET http://187.127.142.16:9090/api/me` returns 401 without a token and user/claim
information with an accepted token. Scope/role failures return 403.

Refresh using another form-encoded `POST /oauth2/token`:

```text
grant_type=refresh_token&client_id=YOUR_CLIENT_ID&refresh_token=CURRENT_REFRESH_TOKEN
```

This backend supports public-client refresh and rotates refresh tokens. Replace
the stored refresh token with the new one atomically; serialize concurrent
refresh requests. Reuse detection can revoke the token family. Preserve a new
`id_token` if supplied by refresh. On `invalid_grant`, clear local login state
and start a new authorization flow. Retry a failed business request at most once
after successful refresh; do not refresh endlessly on 403.

Native apps: keep tokens in platform secure storage, never URLs/logs or plain
preferences. Web apps: prefer in-memory access-token handling and an appropriately
designed secure session/token-storage strategy rather than copying the demo's
debug storage. Local logout clears app tokens; to end the auth-server browser
session too, navigate to discovery's end-session endpoint with the current
`id_token_hint` and a registered `post_logout_redirect_uri`.

## Frontend-owned account screens: current API contract

All URLs below are relative to the auth issuer. Bodies are JSON, except OAuth
token requests above. Account endpoints are unauthenticated but validate proof.
Include a valid `captchaToken` where supported if Turnstile is configured.
For browser session-establishing calls use `credentials: 'include'` (or the
framework equivalent), and configure the backend's `FE_ORIGIN` for the real web
origin. A native HTTP client does not use CORS, but browser cookies still matter.

### Google

`POST /api/auth/google-login`:

```json
{"idToken":"GOOGLE_ID_TOKEN_FOR_THE_CONFIGURED_GOOGLE_CLIENT"}
```

Existing usable account: 200 with `username`, `email`, `newUser`, `redirectTo`
and a backend login session cookie. No OAuth code or token set is returned by
this endpoint. Follow `redirectTo` in the SAME browser context to resume the
authorization request, then use the code callback and token exchange above.
Unknown Google account: 404 with `error: registration_required`,
`registrationRequired: true`, `email`, `name`, and `pictureUrl`; collect onboarding
data and register using the SAME Google ID token. Invalid token: 401.
Google SDK token audience must match backend `GOOGLE_CLIENT_ID`; do not assume
an Android client ID and a web/server client ID are interchangeable.

### Email OTP login (optional)

`POST /api/auth/continue-with-email/request`:
`{"email":"user@example.com","captchaToken":"..."}`.
200 returns `exists` and `message`. If `exists` is false, offer registration.

`POST /api/auth/continue-with-email/verify`:
`{"email":"user@example.com","otp":"123456"}`.
200 returns `username`, `newUser`, `redirectTo` and establishes the browser
session. Follow the redirect in that browser and finish PKCE. Invalid OTP: 400.

### Forgot password

`POST /api/auth/forgot-password/request`:
`{"username":"user@example.com","captchaToken":"..."}`.
Show the generic confirmation message; do not assume an account exists.

`POST /api/auth/forgot-password/reset`:
`{"username":"user@example.com","otp":"123456","newPassword":"NewPassword123!"}`.
The request field is `username` (an email/phone identifier), not `email`.
Successful reset does not log the user in and does not return an authorization
code. Start/resume the authorization flow after reset. There is no separate
`/api/auth/forgot-password/verify` endpoint; reset verifies the supplied OTP.

### Registration

First call `POST /api/auth/register/request-otp` with
`{"email":"new@example.com","captchaToken":"..."}` for email registration.
200 returns `alreadyRegistered` and `message`. Do not use the existing-account
email-login OTP request endpoint to register a new account.

Then call `POST /api/auth/register` with the actual onboarding data and either
`otp` or `googleIdToken` proving the SAME email address, for example:

```json
{
  "email": "new@example.com",
  "name": "Example User",
  "gender": "female",
  "relationship": "SELF",
  "dateOfBirth": "1995-04-12",
  "password": "Password123!",
  "otp": "123456"
}
```

Accepted gender values are `male`, `female`, and `prefer_not_to_say`; relationship
values are `SELF`, `PARENT`, and `CHILD`. Google registration uses `googleIdToken`
instead of `otp`. Additional DTO fields include `username`, `countryCode`,
`phone`, `petName`, `avatarName`, `avatarImageName`, `familyCode`, `familyName`,
`referralCode`, `asChild`, and `unlockPotential`. CHILD requires an existing family
code; PARENT requires familyCode or familyName; SELF has its own onboarding rules.
Phone-only OTP registration is not supported by this project: no SMS sender exists.

Current behavior: registration returns 201/200 with access/refresh tokens, `user`
when available, `newUser`, and `redirectTo`, and establishes a browser session.
These DIRECT registration tokens do not contain an OIDC ID token. For the desired
uniform code-then-token architecture, do not treat them as your PKCE result:
continue the browser authorization via `redirectTo`, or begin a fresh browser
authorization, and obtain the final tokens from `/oauth2/token`.
Registration itself does not return an authorization code. Changing it to a
code-only/session-only response would require a separate backend change.

The legacy `/v1/auth/login` and `/v1/auth/register` APIs return direct-token
compatibility responses. Do not use them as the password-login step in PKCE.

## Native APK: browser session limitation that must be respected

Use the system browser / Custom Tabs for `/oauth2/authorize`, with an app callback.
Do not embed the backend password page in a credential-capturing WebView.
The browser owns the auth-server session; the native app owns the PKCE verifier
and receives only the callback URL. The token exchange does NOT need that cookie.

If native Google SDK login sends its ID token from the app's HTTP client,
`/api/auth/google-login` establishes a session in THAT client, not the Custom Tab.
Opening its returned `redirectTo` in the Custom Tab does not transfer the session.
The same limitation applies to native email OTP login and native registration.
Do not inject cookies into the browser, append tokens to URLs, or assume those
endpoints return codes. Currently working options:

- Password login through the backend browser page followed by the native callback.
- Google/registration handled in the backend browser page, sharing its session.
- Frontend-owned account pages in a browser that keeps the same auth-server cookie
  context, with credentialed calls and correct web-origin/cookie configuration.
- Native registration/reset screens as account operations, followed by a NEW
  external-browser authorization flow; a second browser authentication may be needed.

To require native Google/OTP/registration UI AND single-step continuation into
the browser PKCE flow, add a reviewed backend session-handoff design (for example
a short-lived, single-use, transaction-bound handoff). Such an endpoint does NOT
exist today. HTTPS domains and cookie policy must also be configured for real
web applications on a different site than this auth server.

The backend login page currently includes Google/Google-registration UI itself
and a signup link based on `FE_BASE_URL`. Moving all of those screens to the real
frontend requires changing those backend links/UI separately. The demo Angular
frontend can be retired only after the real app's callback and account links are
configured and tested. For native-only apps, hosting web account pages or defining
an explicit browser-to-app account-flow handoff needs a deliberate design.

## Backend settings the integrating team must supply

- Real web origin, if any: `FE_ORIGIN` on auth and resource services.
- Real account-page URLs: `FE_BASE_URL`, `FE_FORGOT_PASSWORD_URL`,
  `FE_CONTINUE_WITH_EMAIL_URL`; native deep links need flow/session planning above.
- Registered app client ID, callback(s), and post-logout URI.
- Matching HTTPS issuer on both auth and resource services.
- Mail credentials for OTP/reset: the previously shown server settings were empty.
- `SUPERME_WRITES_ENABLED=true` only when account registration, reset and provider
  linking against the shared database are intended. Previously it was false, which
  disables registration and password-reset writes.
- Correct Google client audience and optional Turnstile configuration.

## Acceptance checklist for the frontend agent

- No frontend-owned password login form; authorization opens the backend page.
- Callback succeeds on cold app launch and activity/browser navigation.
- State mismatch, missing verifier, cancellation and callback errors are handled.
- Wrong verifier/code reuse is rejected; one successful callback exchanges once.
- Token endpoint is a separate form-encoded POST; no client secret in the app.
- Bearer access token reaches the real protected API; ID token is not used as bearer.
- Concurrent 401s cause one refresh; rotated refresh/ID tokens are saved.
- Registration, reset, Google and OTP failures have clear user-facing states.
- Logout clears local state and, when requested, ends the auth-server session.
- Real app client/URLs replace demo port 4203; no dependency on the demo frontend.
- Native Google/OTP session handoff is not claimed complete without backend support.

Standards: [PKCE, RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html)
and [native-app browser authorization, RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html).
