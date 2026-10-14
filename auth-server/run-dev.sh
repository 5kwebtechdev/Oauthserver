#!/usr/bin/env bash
# Runs auth-server with env vars from .env (copy .env.example to .env first).
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Missing .env - copy .env.example to .env and fill in real values first." >&2
  exit 1
fi

set -a
source .env
set +a

../mvnw spring-boot:run
