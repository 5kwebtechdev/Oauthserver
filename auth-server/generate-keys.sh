#!/usr/bin/env bash
# Generates a new RSA-2048 keypair for JWT signing and a stable key id (kid).
# Run this once per key, and again whenever rotating keys (see ARCHITECTURE.md).
# Output lands in ./keys/ which is gitignored — never commit these files.
set -euo pipefail
cd "$(dirname "$0")"

OUT_DIR="keys"
mkdir -p "$OUT_DIR"

TS="$(date +%Y%m%d%H%M%S)"
PRIVATE="$OUT_DIR/private_key_${TS}.pem"
PUBLIC="$OUT_DIR/public_key_${TS}.pem"

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$PRIVATE"
openssl rsa -pubout -in "$PRIVATE" -out "$PUBLIC"

KID="$(openssl rsa -pubin -in "$PUBLIC" -outform DER 2>/dev/null | sha256sum | cut -c1-16)"

echo "Generated keypair:"
echo "  private: $PRIVATE"
echo "  public : $PUBLIC"
echo "  kid    : $KID"
echo ""
echo "Point the app at these via env vars, e.g.:"
echo "  JWT_PRIVATE_KEY_PATH=$(pwd)/$PRIVATE"
echo "  JWT_PUBLIC_KEY_PATH=$(pwd)/$PUBLIC"
echo "  JWT_KEY_ID=$KID"
