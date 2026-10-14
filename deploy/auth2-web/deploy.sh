#!/usr/bin/env bash
set -euo pipefail
bundle=${1:?Bundle directory required}
release=${2:?Release identifier required}
[[ "$release" =~ ^[0-9]+-[0-9]+$ ]] || { echo 'Invalid release identifier'; exit 1; }
base=/var/www/superme-auth2
site=/etc/nginx/conf.d/superme-auth2-4204.conf
mkdir -p "$base/releases/$release"
test -f "$bundle/www/index.html"
cp -a "$bundle/www/." "$base/releases/$release/"
chmod -R a+rX "$base/releases/$release"
previous=$(readlink "$base/current" || true)
backup=$(mktemp)
existing=false
if test -f "$site"; then cp "$site" "$backup"; existing=true; fi
rollback() {
  if [ -n "$previous" ]; then ln -sfn "$previous" "$base/current.rollback"; mv -Tf "$base/current.rollback" "$base/current";
  else rm -f "$base/current"; fi
  if $existing; then cp "$backup" "$site"; else rm -f "$site"; fi
  nginx -t && systemctl reload nginx || true
}
trap 'rm -f "$backup"' EXIT
cp "$bundle/nginx.conf" "$site"
ln -sfn "$base/releases/$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
if ! nginx -t || ! systemctl reload nginx; then rollback; exit 1; fi
if ! curl --fail --silent --show-error --retry 3 http://127.0.0.1:4204/ -o /dev/null; then rollback; exit 1; fi
if ! curl --fail --silent --show-error http://127.0.0.1:4204/callback -o /dev/null; then rollback; exit 1; fi
echo "SuperMeAppFE deployed on port 4204: $release"
