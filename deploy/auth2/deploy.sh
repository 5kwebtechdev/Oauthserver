#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ $EUID -eq 0 ]] || { echo 'Deployment requires root or passwordless sudo.' >&2; exit 1; }
stage=${1:?Missing staging directory}
release=${2:?Missing release ID}
[[ $release =~ ^[0-9]+-[0-9]+$ ]] || { echo 'Invalid release ID'; exit 1; }
deploy_dir=/root/Auth2.0
services=(auth2-auth auth2-resource)

for tool in java curl openssl systemctl flock ss; do
  command -v "$tool" >/dev/null || { echo "Install missing server dependency: $tool"; exit 1; }
done
[[ -x /usr/bin/java ]] || { echo 'Java must be installed at /usr/bin/java'; exit 1; }
java_version=$(/usr/bin/java -version 2>&1)
[[ $java_version =~ version\ \"21\. ]] || { echo 'Install Java 21 on the server.'; exit 1; }

install -d -m 0700 "$deploy_dir" "$deploy_dir/releases"
exec 9>"$deploy_dir/deploy.lock"
flock -w 300 9 || { echo 'Another Auth2.0 deployment is running'; exit 1; }

needs_configuration=false
for app in auth resource; do
  if [[ ! -f "$deploy_dir/$app.env" ]]; then
    install -m 0600 "$stage/$app.env.example" "$deploy_dir/$app.env"
  fi
  chmod 0600 "$deploy_dir/$app.env"
  if unresolved_settings=$(sed -n '/^[[:space:]]*#/!{/CHANGE_ME/p;}' "$deploy_dir/$app.env") && [[ -n $unresolved_settings ]]; then
    echo "Configure $deploy_dir/$app.env first (database credentials and frontend URLs)."
    needs_configuration=true
  fi
done

# Refuse to take a port owned by SuperMe or a manually started Java process.
for spec in auth:9000 resource:9090; do
  app=${spec%:*}
  port=${spec#*:}
  listener=$(ss -H -ltnp "sport = :$port")
  if [[ -n $listener ]]; then
    service_pid=$(systemctl show "auth2-$app" --property=MainPID --value 2>/dev/null || true)
    if [[ ! $service_pid =~ ^[1-9][0-9]*$ || $listener != *"pid=$service_pid,"* ]]; then
      echo "Port $port is already occupied by another process. Resolve the conflict before deploying; no services were changed."
      exit 1
    fi
  fi
done
[[ $needs_configuration == false ]] || { echo 'No services were changed. Configure the files and rerun the workflow.'; exit 1; }

# These are fixed deployment ports; do not silently probe a different service.
for spec in auth:9000 resource:9090; do
  app=${spec%:*}
  port=${spec#*:}
  if ! sed -n '/^[[:space:]]*SERVER_PORT=/p' "$deploy_dir/$app.env" | grep -qx "SERVER_PORT=$port"; then
    echo "Set SERVER_PORT=$port in $deploy_dir/$app.env (deployment health-check port)."; exit 1
  fi
done

[[ -r /root/privateKey.pem && -r /root/publicKey.pem ]] || { echo 'Missing /root/privateKey.pem or /root/publicKey.pem'; exit 1; }
chmod 0600 /root/privateKey.pem
[[ $(head -n 1 /root/privateKey.pem) == '-----BEGIN PRIVATE KEY-----' ]] || {
  echo 'Private key must be unencrypted PKCS#8 (BEGIN PRIVATE KEY). Use setup-server-keys.sh or convert it before deployment.'; exit 1;
}
[[ $(head -n 1 /root/publicKey.pem) == '-----BEGIN PUBLIC KEY-----' ]] || { echo 'Public key must be X.509/SPKI (BEGIN PUBLIC KEY).'; exit 1; }
openssl rsa -in /root/privateKey.pem -passin pass: -check -noout >/dev/null
openssl pkey -in /root/privateKey.pem -passin pass: -pubout -out "$stage/derived-public.pem"
openssl pkey -pubin -in /root/publicKey.pem -pubout -out "$stage/normalized-public.pem"
cmp -s "$stage/derived-public.pem" "$stage/normalized-public.pem" || { echo 'Server RSA keys do not match'; exit 1; }

[[ ! -e "$deploy_dir/current" || -L "$deploy_dir/current" ]] || { echo 'current must be a release symlink, not a directory'; exit 1; }
previous_release=$(readlink -f "$deploy_dir/current" || true)
[[ -L "$deploy_dir/current" ]] || previous_release=''
release_dir="$deploy_dir/releases/$release"
[[ ! -e "$release_dir" ]] || { echo 'Release already exists'; exit 1; }
test -s "$stage/auth-server.jar"
test -s "$stage/resource-server.jar"
install -d -m 0700 "$release_dir"
install -m 0600 "$stage/auth-server.jar" "$stage/resource-server.jar" "$release_dir/"

for service in "${services[@]}"; do
  # Keep copies of any previous unit definitions for rollback.
  if [[ -f /etc/systemd/system/$service.service ]]; then
    cp "/etc/systemd/system/$service.service" "$stage/$service.previous.service"
  fi
done

wait_for_apps() {
  local attempt status
  for attempt in {1..60}; do
    if systemctl is-active --quiet auth2-auth && systemctl is-active --quiet auth2-resource &&
       curl --silent --fail --max-time 3 http://127.0.0.1:9000/.well-known/openid-configuration >/dev/null &&
       curl --silent --fail --max-time 3 http://127.0.0.1:9000/oauth2/jwks >/dev/null; then
      status=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 3 http://127.0.0.1:9090/api/me || true)
      # This endpoint must reject requests without an access token.
      if [[ $status == 401 ]]; then
        sleep 5
        systemctl is-active --quiet auth2-auth && systemctl is-active --quiet auth2-resource && return 0
      fi
    fi
    sleep 2
  done
  return 1
}

rollback() {
  trap - ERR
  set +e
  echo 'Deployment failed. Recent service logs:'
  journalctl -u auth2-auth -u auth2-resource -n 80 --no-pager
  systemctl stop "${services[@]}"
  if [[ -n $previous_release && -d $previous_release ]]; then
    ln -sfn "$previous_release" "$deploy_dir/current.rollback"
    mv -Tf "$deploy_dir/current.rollback" "$deploy_dir/current"
    for service in "${services[@]}"; do
      if [[ -f "$stage/$service.previous.service" ]]; then
        install -m 0644 "$stage/$service.previous.service" "/etc/systemd/system/$service.service"
      fi
    done
    systemctl daemon-reload
    systemctl start "${services[@]}"
    if wait_for_apps; then
      echo 'Previous release restored and responding.'
    else
      echo 'Previous release was restored but is unhealthy; inspect journalctl.'
    fi
  else
    echo 'No previous release exists; services remain stopped. Correct the configuration and rerun.'
  fi
  exit 1
}

trap rollback ERR
for service in "${services[@]}"; do
  if systemctl cat "$service" >/dev/null 2>&1; then
    systemctl stop "$service"
  fi
done
install -m 0644 "$stage/auth2-auth.service" "$stage/auth2-resource.service" /etc/systemd/system/
ln -sfn "$release_dir" "$deploy_dir/current.next"
mv -Tf "$deploy_dir/current.next" "$deploy_dir/current"
systemctl daemon-reload
# Google signup registration runs on Auth2.0; enforce the intended account-write
# setting in the persistent environment before starting the auth service.
if grep -q '^SUPERME_WRITES_ENABLED=' "$deploy_dir/auth.env"; then
  sed -i 's/^SUPERME_WRITES_ENABLED=.*/SUPERME_WRITES_ENABLED=true/' "$deploy_dir/auth.env"
else
  printf '\nSUPERME_WRITES_ENABLED=true\n' >> "$deploy_dir/auth.env"
fi
systemctl enable "${services[@]}"
systemctl restart "${services[@]}"
wait_for_apps
trap - ERR
echo "Auth2.0 release $release deployed; both services are responding."
