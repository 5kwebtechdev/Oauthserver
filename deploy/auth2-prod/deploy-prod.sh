#!/usr/bin/env bash
# Deploys ONLY auth-server to the isolated PROD stack (authprod.supermeapp.com).
# Mirrors deploy/auth2/deploy.sh but targets a completely separate deploy dir,
# port, systemd service, and RSA keypair so it can never collide with the dev
# auth2-auth/auth2-resource services. resource-server is not built or deployed
# here — SuperMeBE never calls it, it only checks a token's "aud" claim.
set -Eeuo pipefail
umask 077

[[ $EUID -eq 0 ]] || { echo 'Deployment requires root or passwordless sudo.' >&2; exit 1; }
stage=${1:?Missing staging directory}
release=${2:?Missing release ID}
[[ $release =~ ^[0-9]+-[0-9]+$ ]] || { echo 'Invalid release ID'; exit 1; }
deploy_dir=/root/Auth2.0-prod
service=auth2-auth-prod
private_key=/root/prod-privateKey.pem
public_key=/root/prod-publicKey.pem

for tool in java curl openssl systemctl flock ss; do
  command -v "$tool" >/dev/null || { echo "Install missing server dependency: $tool"; exit 1; }
done
[[ -x /usr/bin/java ]] || { echo 'Java must be installed at /usr/bin/java'; exit 1; }
java_version=$(/usr/bin/java -version 2>&1)
[[ $java_version =~ version\ \"21\. ]] || { echo 'Install Java 21 on the server.'; exit 1; }

install -d -m 0700 "$deploy_dir" "$deploy_dir/releases"
exec 9>"$deploy_dir/deploy.lock"
flock -w 300 9 || { echo 'Another prod Auth2.0 deployment is running'; exit 1; }

# auth.env must already exist on the server (created once, manually, with the
# real mindfullP1/mindfullAdmin credentials) — this script never writes secrets.
if [[ ! -f "$deploy_dir/auth.env" ]]; then
  install -m 0600 "$stage/auth-prod.env.example" "$deploy_dir/auth.env"
  echo "Created $deploy_dir/auth.env from the example template — configure it with real credentials and rerun."
  exit 1
fi
chmod 0600 "$deploy_dir/auth.env"
if unresolved_settings=$(sed -n '/^[[:space:]]*#/!{/CHANGE_ME/p;}' "$deploy_dir/auth.env") && [[ -n $unresolved_settings ]]; then
  echo "Configure $deploy_dir/auth.env first (database credentials and frontend URLs)."
  exit 1
fi

# Refuse to take port 9001 if something other than this service owns it.
listener=$(ss -H -ltnp "sport = :9001")
if [[ -n $listener ]]; then
  service_pid=$(systemctl show "$service" --property=MainPID --value 2>/dev/null || true)
  if [[ ! $service_pid =~ ^[1-9][0-9]*$ || $listener != *"pid=$service_pid,"* ]]; then
    echo "Port 9001 is already occupied by another process. Resolve the conflict before deploying; no services were changed."
    exit 1
  fi
fi

if ! sed -n '/^[[:space:]]*SERVER_PORT=/p' "$deploy_dir/auth.env" | grep -qx "SERVER_PORT=9001"; then
  echo "Set SERVER_PORT=9001 in $deploy_dir/auth.env (deployment health-check port)."; exit 1
fi

[[ -r $private_key && -r $public_key ]] || { echo "Missing $private_key or $public_key"; exit 1; }
chmod 0600 "$private_key"
[[ $(head -n 1 "$private_key") == '-----BEGIN PRIVATE KEY-----' ]] || {
  echo 'Prod private key must be unencrypted PKCS#8 (BEGIN PRIVATE KEY).'; exit 1;
}
[[ $(head -n 1 "$public_key") == '-----BEGIN PUBLIC KEY-----' ]] || { echo 'Prod public key must be X.509/SPKI (BEGIN PUBLIC KEY).'; exit 1; }
openssl rsa -in "$private_key" -passin pass: -check -noout >/dev/null
openssl pkey -in "$private_key" -passin pass: -pubout -out "$stage/derived-public.pem"
openssl pkey -pubin -in "$public_key" -pubout -out "$stage/normalized-public.pem"
cmp -s "$stage/derived-public.pem" "$stage/normalized-public.pem" || { echo 'Prod RSA keys do not match'; exit 1; }

[[ ! -e "$deploy_dir/current" || -L "$deploy_dir/current" ]] || { echo 'current must be a release symlink, not a directory'; exit 1; }
previous_release=$(readlink -f "$deploy_dir/current" || true)
[[ -L "$deploy_dir/current" ]] || previous_release=''
release_dir="$deploy_dir/releases/$release"
[[ ! -e "$release_dir" ]] || { echo 'Release already exists'; exit 1; }
test -s "$stage/auth-server.jar"
install -d -m 0700 "$release_dir"
install -m 0600 "$stage/auth-server.jar" "$release_dir/"

if [[ -f /etc/systemd/system/$service.service ]]; then
  cp "/etc/systemd/system/$service.service" "$stage/$service.previous.service"
fi

wait_for_app() {
  local attempt
  for attempt in {1..60}; do
    if systemctl is-active --quiet "$service" &&
       curl --silent --fail --max-time 3 http://127.0.0.1:9001/.well-known/openid-configuration >/dev/null &&
       curl --silent --fail --max-time 3 http://127.0.0.1:9001/oauth2/jwks >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

rollback() {
  trap - ERR
  set +e
  echo 'Deployment failed. Recent service logs:'
  journalctl -u "$service" -n 80 --no-pager
  systemctl stop "$service"
  if [[ -n $previous_release && -d $previous_release ]]; then
    ln -sfn "$previous_release" "$deploy_dir/current.rollback"
    mv -Tf "$deploy_dir/current.rollback" "$deploy_dir/current"
    if [[ -f "$stage/$service.previous.service" ]]; then
      install -m 0644 "$stage/$service.previous.service" "/etc/systemd/system/$service.service"
    fi
    systemctl daemon-reload
    systemctl start "$service"
    if wait_for_app; then
      echo 'Previous prod release restored and responding.'
    else
      echo 'Previous prod release was restored but is unhealthy; inspect journalctl.'
    fi
  else
    echo 'No previous prod release exists; service remains stopped. Correct the configuration and rerun.'
  fi
  exit 1
}

trap rollback ERR
if systemctl cat "$service" >/dev/null 2>&1; then
  systemctl stop "$service"
fi
install -m 0644 "$stage/auth2-auth-prod.service" /etc/systemd/system/
ln -sfn "$release_dir" "$deploy_dir/current.next"
mv -Tf "$deploy_dir/current.next" "$deploy_dir/current"
systemctl daemon-reload
systemctl enable "$service"
systemctl restart "$service"
wait_for_app
trap - ERR
echo "Auth2.0 PROD release $release deployed; $service is responding."
