#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

base="$tmp/site"
site="$tmp/nginx/dev-4046.conf"
bundle="$tmp/bundle"
mockbin="$tmp/bin"
mkdir -p "$base/releases/100-1/app/nested" "$bundle/website" "$mockbin" "$(dirname "$site")"
printf 'index\n' > "$base/releases/100-1/app/index.html"
printf 'payload\n' > "$base/releases/100-1/app/nested/payload.js"
chmod 750 "$base/releases/100-1/app"
chmod 710 "$base/releases/100-1/app/nested"
chmod 640 "$base/releases/100-1/app/index.html"
chmod 600 "$base/releases/100-1/app/nested/payload.js"
ln -s "$base/releases/100-1" "$base/current"

cat > "$bundle/website/index.html" <<'HTML'
<!doctype html><html><head><meta name="robots" content="noindex, nofollow"></head><body>landing</body></html>
HTML
printf 'User-agent: *\nDisallow: /\n' > "$bundle/website/robots.txt"
printf 'server {}\n' > "$bundle/nginx.conf"

cat > "$mockbin/nginx" <<'MOCK'
#!/usr/bin/env bash
if [[ ${1:-} == -T ]]; then
  printf '# configuration file %s:\n' "$DEV_APK_NGINX_SITE"
elif [[ ${1:-} == -t ]]; then
  exit 0
else
  exit 2
fi
MOCK
cat > "$mockbin/systemctl" <<'MOCK'
#!/usr/bin/env bash
exit 0
MOCK
cat > "$mockbin/curl" <<'MOCK'
#!/usr/bin/env bash
for arg in "$@"; do
  if [[ $arg == *'/callback' ]]; then
    if [[ " $* " == *' --write-out '* ]]; then printf '302'; fi
    exit 0
  fi
done
if [[ " $* " == *' --write-out '* ]]; then printf '200'; fi
MOCK
chmod +x "$mockbin/nginx" "$mockbin/systemctl" "$mockbin/curl"

old_manifest=$(find "$base/releases/100-1/app" -printf '%P %m %u %g\n' | sort)
DEV_APK_RELEASE_BASE="$base" \
DEV_APK_NGINX_SITE="$site" \
PATH="$mockbin:$PATH" \
  bash "$script_dir/deploy.sh" "$bundle" 200-1 >/dev/null

new_manifest=$(find "$base/releases/200-1/app" -printf '%P %m %u %g\n' | sort)
[[ $old_manifest == "$new_manifest" ]]
diff -r "$base/releases/100-1/app" "$base/releases/200-1/app"
[[ $(readlink "$base/current") == "$base/releases/200-1" ]]
[[ -f "$base/releases/200-1/index.html" ]]
echo 'Landing-only deployment preserves the active app tree and file modes.'
