# Frontend deployment on port 4203

Push this frontend repository's `FE` branch to deploy. Workflow:
`.github/workflows/frontend-deploy.yml`. It uses the same three repository secrets:
`SERVER_HOST=187.127.142.16`, `SERVER_USER=root`, and `SERVER_SSH_KEY`.
The GitHub build installs Node 22 dependencies and produces an Angular production
build; Ubuntu needs Nginx, not Node or `ng serve`.

Production URLs/client are in `src/app/core/app-config.prod.ts`. Angular replaces
the local config through `angular.json` production `fileReplacements`.
The callback and logout URLs derive from the browser origin, so port 4203 is used
automatically. The default local resource API now uses port 9090 too.

## One-time server preparation

At your server's root prompt:

```bash
apt update
apt install -y nginx curl iproute2
mkdir -p /var/www/auth2-frontend/releases /var/log/auth2-frontend
chmod 755 /var/www/auth2-frontend /var/www/auth2-frontend/releases /var/log/auth2-frontend
```

The pipeline creates releases, a `current` symlink, its Nginx config
`/etc/nginx/auth2-frontend.conf`, and systemd service `auth2-frontend` automatically.
This Nginx instance has its own configuration/PID and listens only on 4203.
Your existing service on 4200 is not changed.

## Required backend environment changes

Edit `/root/Auth2.0/auth.env`, replacing these settings:

```properties
FE_ORIGIN=http://187.127.142.16:4203
FE_BASE_URL=http://187.127.142.16:4203/
OAUTH_CLIENT_ID=pkce-angular-auth2-client-4203
OAUTH_REDIRECT_URIS=http://187.127.142.16:4203/callback,http://187.127.142.16:4203/silent-refresh.html
OAUTH_POST_LOGOUT_REDIRECT_URI=http://187.127.142.16:4203/
FE_FORGOT_PASSWORD_URL=http://187.127.142.16:4203/forgot-password
FE_CONTINUE_WITH_EMAIL_URL=http://187.127.142.16:4203/continue-with-email
```

Edit `/root/Auth2.0/resource.env`:

```properties
FE_ORIGIN=http://187.127.142.16:4203
SERVER_PORT=9090
```

Keep database credentials, issuer URLs, keys, and auth port 9000 as configured.
The new OAuth client ID is necessary because the backend seeder leaves existing
client callback URLs unchanged. On restart it registers a new client for 4203.

```bash
chmod 600 /root/Auth2.0/auth.env /root/Auth2.0/resource.env
systemctl restart auth2-auth auth2-resource
```

If UFW is active, allow `ufw allow 4203/tcp`; allow the port in your provider
firewall as well. Configure HTTPS for real production logins.

## Deploy and verify

Commit and push changes to `FE`. Open GitHub Actions → Auth2 Frontend CI/CD.
The workflow preserves old releases and restores the previous frontend if
startup or index/callback checks fail.

```bash
systemctl status auth2-frontend --no-pager
curl -i http://127.0.0.1:4203/healthz
curl -I http://127.0.0.1:4203/callback
journalctl -u auth2-frontend -n 50 --no-pager
```

Open `http://187.127.142.16:4203` in your browser and start login from there.
Auth API stays on 9000; resource API stays on 9090. The public frontend contains
no database credentials or private keys.

References: [Angular deployment and route fallback](https://angular.dev/tools/cli/deployment),
[Nginx static content](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/).
