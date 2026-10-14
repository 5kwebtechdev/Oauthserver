#!/usr/bin/env bash
# Run as root on Ubuntu. Existing key material is preserved; no keys are generated.
set -euo pipefail
umask 077

if [[ $EUID -ne 0 ]]; then
  echo 'Run this script as root or with sudo.' >&2
  exit 1
fi

private_source=${1:-/root/privateKey.pem}
public_source=${2:-/root/publicKey.pem}
[[ -f "$private_source" && -f "$public_source" ]] || {
  echo "Both key files must exist: $private_source and $public_source" >&2
  exit 1
}
command -v openssl >/dev/null
chmod 0600 "$private_source"

scratch_dir=$(mktemp -d)
trap 'rm -rf "$scratch_dir"' EXIT

# Convert an unencrypted RSA private key to the PKCS#8 format required by Java.
# An empty input passphrase rejects encrypted keys without an interactive prompt.
openssl rsa -in "$private_source" -passin pass: -check -noout >/dev/null
openssl pkcs8 -topk8 -nocrypt -in "$private_source" -passin pass: -out "$scratch_dir/private.pem"
openssl pkey -pubin -in "$public_source" -pubout -out "$scratch_dir/public.pem"
openssl pkey -in "$scratch_dir/private.pem" -pubout -out "$scratch_dir/derived-public.pem"
if ! cmp -s "$scratch_dir/public.pem" "$scratch_dir/derived-public.pem"; then
  echo 'The private and public keys do not match. Nothing was installed.' >&2
  exit 1
fi

# Refuse accidental replacement of an already deployed signing key pair.
for key_file in private.pem public.pem; do
  if [[ -e "/etc/pkce/keys/$key_file" ]] && ! cmp -s "$scratch_dir/$key_file" "/etc/pkce/keys/$key_file"; then
    echo "Different deployed key exists: /etc/pkce/keys/$key_file. Nothing was installed." >&2
    exit 1
  fi
done

if ! id pkce >/dev/null 2>&1; then
  useradd --system --user-group --home-dir /opt/pkce --shell /usr/sbin/nologin pkce
fi
install -d -o root -g pkce -m 0750 /opt/pkce /etc/pkce /etc/pkce/keys
install -o root -g pkce -m 0640 "$scratch_dir/private.pem" /etc/pkce/keys/private.pem
install -o root -g pkce -m 0640 "$scratch_dir/public.pem" /etc/pkce/keys/public.pem
runuser -u pkce -- test -r /etc/pkce/keys/private.pem
runuser -u pkce -- test -r /etc/pkce/keys/public.pem

echo 'Matching RSA keys installed and readable by the pkce service user.'
echo 'Private key: /etc/pkce/keys/private.pem'
echo 'Public key:  /etc/pkce/keys/public.pem'
echo 'Restart existing services after updating keys: systemctl restart pkce-auth pkce-resource'
