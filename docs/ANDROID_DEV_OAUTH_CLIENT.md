# Separate Android OAuth client for DEV

This change prepares an isolated public OAuth client for the DEV Android app. The client is
disabled by default: the native app's exact login callback and post-logout redirect have not
been confirmed in its current frontend flow. Do not set `ANDROID_DEV_OAUTH_CLIENT_ID` until
those URI values are supplied by the Android frontend owner.

## Intended registration

After callback confirmation, configure the DEV auth service with:

```dotenv
ANDROID_DEV_OAUTH_CLIENT_ID=supermeapp-dev-android
ANDROID_DEV_OAUTH_REDIRECT_URIS=<exact-Android-login-callback>
ANDROID_DEV_OAUTH_POST_LOGOUT_REDIRECT_URIS=<exact-Android-logout-callback>
ANDROID_DEV_ACCESS_TOKEN_TTL=PT15M
ANDROID_DEV_REFRESH_TOKEN_TTL=P7D
```

Multiple registered URIs may be comma-separated. The client is public (`none`), allows
`authorization_code` and `refresh_token`, requires PKCE, and is configured with
`reuseRefreshTokens=false` (rotating refresh tokens). Scopes mirror the current DEV app:
`openid profile notes.read notes.write`.

The access-token customization already issues the DEV API audience `pkce-resource-server`;
the DEV resource server expects that audience. No Android-specific audience override is
needed. The separate client id selects the existing DEV login/account context.

## Startup lifetime behavior

`RegisteredClientTokenSettingsUpdater` continues using `ACCESS_TOKEN_TTL` and
`REFRESH_TOKEN_TTL` for all clients except the configured Android DEV client. The latter
uses `ANDROID_DEV_ACCESS_TOKEN_TTL` and `ANDROID_DEV_REFRESH_TOKEN_TTL`; its defaults are
15 minutes and 7 days. The existing website client remains on its existing deployed
15-minute / 20-minute values when the service environment sets those existing variables.
The Android registration seeder is a separate component and does not modify the website
client's redirects, grants, scopes, or authentication method.

## Requests

Authorization uses the hosted DEV auth server and Authorization Code + PKCE S256, with
`client_id=supermeapp-dev-android`, the confirmed native redirect URI, and the scopes above.
There is no client secret.

Refresh request:

```http
POST https://auth.supermeapp.com/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=<stored-refresh-token>&client_id=supermeapp-dev-android
```

Persist the returned access and rotated refresh tokens together. The authorization server's
existing OIDC behavior may omit `id_token` on a refresh response; do not replace a stored ID
token with a missing value. For logout, the isolated `GET /android-dev-logout` endpoint
accepts optional `id_token_hint` and `post_logout_redirect_uri`. It removes an authorization
only when the ID token resolves to the configured Android client, then redirects only to a
URI registered for that client (otherwise it falls back to the auth login page). It does not
change `/apklogout` or website logout. As with other signed JWT access tokens, removing the
authorization prevents refresh but does not invalidate already-issued access tokens before
their expiry.

## Verification boundary

These source changes do not register a client in the deployed DEV database. Registration,
runtime testing, and exact callback values remain pending frontend callback confirmation and
a DEV deployment. No production files or services are part of this change.
