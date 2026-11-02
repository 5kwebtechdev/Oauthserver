# Dev landing page deployment (port 4046)

This deployment serves the vendored marketing-site snapshot at the root of
`devapk.supermeapp.com`. It keeps the existing APK/OAuth frontend under `/app`.
Production hosts and the SuperMeWebsiteFE repository are outside this deployment.

## Server map

| Responsibility | Location |
| --- | --- |
| HTTPS host and proxy to port 4046 | `/etc/nginx/conf.d/devapk.conf` |
| Landing page and APK routing on port 4046 | `/etc/nginx/conf.d/superme-apk-fe-ci-4046.conf` |
| Immutable releases and active symlink | `/var/www/superme-apk-fe-ci/releases/` and `/var/www/superme-apk-fe-ci/current` |
| Vendored landing-page source | `dev-landing-website/` |
| Build, SEO preparation, and release scripts | `.github/workflows/dev-landing-page-deploy.yml` and this directory |

The HTTPS vhost sends traffic to port 4046. That server block serves `/` from
the landing-page build, serves the active app under `/app`, and redirects
`/login`, `/signup`, `/callback`, and `/forgot-password` into the matching app
routes. Dev indexing is disabled: `robots.txt` disallows crawling and
`/sitemap.xml` returns 404. Keep those dev SEO rules separate from production.

## Build and deploy

Pushes to `dev_landing_page` build and publish a landing-only artifact. The
workflow’s SSH deployment remains gated by `DEV_LANDING_SSH_DEPLOY_ENABLED`.
The deploy script requires a prepared `bundle/` containing `website/`,
`nginx.conf`, and `deploy.sh`; it copies the active release’s `app/` tree into
the new release before switching `current`. It does not rebuild or replace the
APK app. Run the preservation fixture with:

```bash
bash deploy/apk-code-fe/deploy.test.sh
```

The server deployment command is:

```bash
bash /path/to/bundle/deploy.sh /path/to/bundle RELEASE_ID
```

Use a unique numeric release ID such as `20261102-2`. The script validates the
dev SEO files, checks the Nginx configuration and port-4046 routes, and restores
the prior symlink and Nginx file if its checks fail.

## Backup and rollback

Before manual server changes, save the current release and `/etc/nginx` under
`/root/rollback-backups/`, record the active `current` target, and verify the
archive with `gzip -t` and `sha256sum`. The verified snapshot taken before this
cleanup is recorded at:

`/root/rollback-backups/superme-dev-simplify-20261102-235401+0530/`

To roll back to a retained release, first confirm its app and landing index
exist, then switch the symlink and validate Nginx:

```bash
base=/var/www/superme-apk-fe-ci
target=RELEASE_ID
test -f "$base/releases/$target/index.html"
test -f "$base/releases/$target/app/index.html"
ln -sfn "$base/releases/$target" "$base/current.rollback"
mv -Tf "$base/current.rollback" "$base/current"
nginx -t && systemctl reload nginx
```

Do not delete older releases as part of a landing-page deployment; they are
useful rollback points. The separate `/var/www/superme-apk-dev` and
`/var/www/superme-dev` trees belong to other dev services and are not managed
by this deployment.
