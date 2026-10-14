# SuperMeAppFE on port 4204

This change adds a second public OAuth client, `supermeapp-web-4204`, to the existing auth server on port 9000. The original `pkce-angular-auth2-client-4203` registration and its environment settings are retained. Nothing in this change deploys to ports 4200 or 4203.

## Backend environment changes

Edit `/root/Auth2.0/auth.env`. Replace its existing FE_ORIGIN line (do not append a second FE_ORIGIN entry):

```env
FE_ORIGIN=http://187.127.142.16:4203,http://187.127.142.16:4204
```

Keep the original FE_BASE_URL, OAUTH_CLIENT_ID, OAUTH_REDIRECT_URIS, OAUTH_POST_LOGOUT_REDIRECT_URI, FE_FORGOT_PASSWORD_URL, and FE_CONTINUE_WITH_EMAIL_URL values exactly as they are. Append:

```env
SUPERME_OAUTH_CLIENT_ID=supermeapp-web-4204
SUPERME_OAUTH_REDIRECT_URIS=http://187.127.142.16:4204/callback
SUPERME_OAUTH_POST_LOGOUT_REDIRECT_URI=http://187.127.142.16:4204/
SUPERME_FE_BASE_URL=http://187.127.142.16:4204/
SUPERME_FE_SIGNUP_URL=http://187.127.142.16:4204/signup
SUPERME_FE_FORGOT_PASSWORD_URL=http://187.127.142.16:4204/forgot-password
SUPERME_FE_CONTINUE_WITH_EMAIL_URL=http://187.127.142.16:4204/signup
```

Also replace FE_ORIGIN in `/root/Auth2.0/resource.env` with the same origin list. If either actual env file already allows other origins, retain them in the list. No issuer, signing-key, database, mail, or service-port changes are needed. No credentials are included in the example file.

Deploy the updated BE using its existing Auth2.0 workflow. The service restart loads the new origin list and registers the additional client automatically. It does not modify an existing registration; subsequent callback changes require an explicit registered-client update. You can add the new settings before deploying the backend; the previous backend will ignore the additional settings, but do not replace FE_ORIGIN with a list until deploying the version that parses it.

## Frontend build and deployment

Changes live in `/home/mohit/MobileAppCode/SuperMeAppFE`. The new build command is:

```bash
npm ci
npx ng build --configuration auth2
```

Output is `www/`. `environment.auth2.ts` enables browser PKCE with client `supermeapp-web-4204` and issuer `http://187.127.142.16:9000`. The existing production/native configurations retain their legacy auth flow. This change does not implement native PKCE or change Android Firebase distribution.

The separate `.github/workflows/auth2-web-deploy.yml` runs on pushes to `Auth2.0`, or manually. Place it at the frontend GitHub repository root. It installs dependencies, checks TypeScript, runs focused PKCE tests, builds `auth2`, and deploys a versioned release over SSH.

Required frontend repository secrets:

- SERVER_HOST: the deployment server
- SERVER_USER: root or a user with the required passwordless sudo
- SERVER_SSH_KEY: its SSH key
- SERVER_KNOWN_HOSTS: trusted known_hosts entries for that server, verified out of band

The last secret is additional to the existing backend workflow's secrets. Keep SSH private keys out of source files.

The server needs Nginx, curl and GNU coreutils, with port 4204 available and reachable through the existing firewall. The deploy script installs only `/etc/nginx/conf.d/superme-auth2-4204.conf`, reloads Nginx, and serves `/var/www/superme-auth2/current` on 4204. Releases live under `/var/www/superme-auth2/releases/<run>-<attempt>`. Failed Nginx validation/reload or HTTP health checks restore the prior release/configuration. Existing sites are retained. Health checks confirm HTML serving, not successful authentication or business API compatibility.

## Authentication behavior

`/login` starts PKCE and opens the shared BE login page. `/callback` processes tokens before guarded route navigation. The BE chooses signup/reset links from the saved OAuth authorization request's client ID, using configured URLs rather than arbitrary request redirects. The original client's login links remain unchanged.

The standard token response plus its custom `user` payload initializes the existing app user state. OAuth state/tokens are namespaced in localStorage; account-switch cleanup preserves only the newly validated OAuth transaction. Refresh requests share a single in-flight exchange, and a protected request is retried only once. Existing business services that read auth_token receive the current OAuth access token. Parent/self/child routing and onboarding resume are used after the callback. Local app cleanup runs before OIDC logout.

Existing signup, family/onboarding operations and password reset screens continue calling the existing business API. They are not redirected wholesale to the small PKCE resource server. Email signup eventually starts PKCE through the AuthService login entry point. Native Apple/Google login is unchanged; this BE login page provides Google, not Apple.

## Required integration check

The dedicated frontend build still uses `https://api.supermeapp.com/v1` for business APIs. The business API must:

1. Allow Origin `http://187.127.142.16:4204` in its CORS configuration.
2. Validate the auth-server token signature, exact issuer, and accepted audience (`pkce-resource-server` in the current auth-server token configuration).
3. Resolve the token's email/phone subject to the correct SuperMe user, rather than assuming the old token's subject format.
4. Accept these tokens for authenticated WebSocket/STOMP connections too.

The business backend source and live server configuration are not available in this workspace, so these points have not been verified or changed. Changing the auth and resource server CORS settings does not change business API CORS. Do not treat a successful auth-server login as proof that all SuperMe API features are authenticated correctly.

## Verification after deployment

- Open the existing 4203 app and verify login/callback/logout still work.
- Open http://187.127.142.16:4204/login and verify the authorization URL uses client supermeapp-web-4204.
- Check signup/reset links point to 4204 and successful login returns to 4204/callback.
- Verify parent/self/child dashboard selection and incomplete onboarding.
- Check a protected business API request and the badge WebSocket use the new token successfully.
- Check refresh rotates the token, reload restores the session, and logout clears user state and the auth-server session.
- Check browser history and callback refresh resolve through Nginx's Angular fallback.

Use the existing HTTP issuer and ports for this requested staging integration. Production HTTPS migration must update issuer, frontend configuration, registered URLs and origins together.
