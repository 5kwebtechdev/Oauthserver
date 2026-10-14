#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || { echo 'Root or passwordless sudo required'; exit 1; }
stage=${1:?Missing stage}
release=${2:?Missing release}
[[ $release =~ ^[0-9]+-[0-9]+$ ]] || exit 1
base=/var/www/auth2-frontend
config=/etc/nginx/auth2-frontend.conf
unit=/etc/systemd/system/auth2-frontend.service
for cmd in nginx curl ss flock; do
  command -v "$cmd" >/dev/null || { echo "Install $cmd first (see deploy/README.md)"; exit 1; }
done
install -d -m 0755 "$base" "$base/releases" /var/log/auth2-frontend
exec 9>"$base/deploy.lock"
flock -w 300 9
listener=$(ss -H -ltnp 'sport = :4201')
pid=$(systemctl show auth2-frontend --property=MainPID --value 2>/dev/null || true)
if [[ -n $listener && ( ! $pid =~ ^[1-9][0-9]*$ || $listener != *"pid=$pid,"* ) ]]; then
  echo 'Port 4201 is occupied by another service; no deployment changes made.'; exit 1
fi
[[ ! -e "$base/current" || -L "$base/current" ]] || { echo 'current must be a release symlink'; exit 1; }
previous=''
[[ ! -L "$base/current" ]] || previous=$(readlink -f "$base/current")
test -s "$stage/site/index.html"
test -s "$stage/site/silent-refresh.html"
[[ ! -e "$base/releases/$release" ]] || { echo 'Release exists'; exit 1; }
install -d -m 0755 "$base/releases/$release"
cp -a "$stage/site/." "$base/releases/$release/"
find "$base/releases/$release" -type d -exec chmod 0755 {} +
find "$base/releases/$release" -type f -exec chmod 0644 {} +
[[ ! -f $config ]] || cp "$config" "$stage/previous.conf"
[[ ! -f $unit ]] || cp "$unit" "$stage/previous.service"

rollback() {
  trap - ERR
  set +e
  journalctl -u auth2-frontend -n 50 --no-pager
  if [[ -n $previous && -d $previous ]]; then
    ln -sfn "$previous" "$base/current.rollback"
    mv -Tf "$base/current.rollback" "$base/current"
  else
    systemctl stop auth2-frontend
  fi
  if [[ -f "$stage/previous.conf" ]]; then cp "$stage/previous.conf" "$config"; else rm -f "$config"; fi
  if [[ -f "$stage/previous.service" ]]; then cp "$stage/previous.service" "$unit"; else rm -f "$unit"; fi
  systemctl daemon-reload
  if [[ -n $previous ]]; then systemctl restart auth2-frontend; fi
  echo 'Deployment failed; previous frontend restored when available.'
  exit 1
}
trap rollback ERR
install -m 0644 "$stage/auth2-frontend.conf" "$config"
install -m 0644 "$stage/auth2-frontend.service" "$unit"
ln -sfn "$base/releases/$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
systemctl daemon-reload
systemctl enable auth2-frontend
systemctl restart auth2-frontend
ready=false
for attempt in {1..30}; do
  if systemctl is-active --quiet auth2-frontend &&
     curl -fsS --max-time 3 http://127.0.0.1:4201/index.html -o "$stage/served-index.html" &&
     cmp -s "$stage/site/index.html" "$stage/served-index.html" &&
     curl -fsS --max-time 3 http://127.0.0.1:4201/callback -o "$stage/served-callback.html" &&
     cmp -s "$stage/site/index.html" "$stage/served-callback.html"; then
    ready=true; break
  fi
  sleep 2
done
[[ $ready == true ]]
trap - ERR
echo 'Frontend deployed at http://187.127.142.16:4201'
