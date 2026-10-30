#!/usr/bin/env bash
set -euo pipefail
bundle=${1:?Bundle directory required}
release=${2:?Release identifier required}
[[ "$release" =~ ^[0-9]+-[0-9]+$ ]] || { echo 'Invalid release identifier'; exit 1; }
base=/var/www/superme-apk-fe-ci
site=/etc/nginx/conf.d/superme-apk-fe-ci-4046.conf
mkdir -p "$base/releases/$release"
test -f "$bundle/www/index.html"
cp -a "$bundle/www/." "$base/releases/$release/"
chmod -R a+rX "$base/releases/$release"
previous=$(readlink "$base/current" || true)
backup=$(mktemp)
config_dump=$(mktemp)
existing=false
if test -f "$site"; then cp "$site" "$backup"; existing=true; fi
rollback() {
  if [ -n "$previous" ]; then ln -sfn "$previous" "$base/current.rollback"; mv -Tf "$base/current.rollback" "$base/current";
  else rm -f "$base/current"; fi
  if $existing; then cp "$backup" "$site"; else rm -f "$site"; fi
  nginx -t && systemctl reload nginx || true
}
trap 'rm -f "$backup" "$config_dump"' EXIT
cp "$bundle/nginx.conf" "$site"
ln -sfn "$base/releases/$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
if ! nginx -T > "$config_dump" 2>&1; then
  cat "$config_dump"
  rollback; exit 1
fi
if ! grep -Fq "# configuration file $site:" "$config_dump"; then
  echo "Nginx is not loading $site. Its http block must include /etc/nginx/conf.d/*.conf."
  rollback; exit 1
fi
if ! systemctl reload nginx; then rollback; exit 1; fi
# Nginx reload is asynchronous. Retry connection refusal while new workers start.
check_page() {
  curl --fail --silent --show-error --connect-timeout 2 --max-time 5 \
    --retry 10 --retry-connrefused --retry-delay 1 --retry-max-time 45 \
    "http://127.0.0.1:4046$1" -o /dev/null
}
if ! check_page / || ! check_page /callback; then
  echo 'Port 4046 health check failed. Capturing diagnostics before rollback.'
  ss -ltn '( sport = :4046 )' || true
  journalctl -u nginx -n 30 --no-pager || true
  rollback; exit 1
fi
echo "apk_code_fe deployed on port 4046: $release"
