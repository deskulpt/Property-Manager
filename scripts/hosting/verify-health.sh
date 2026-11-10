#!/usr/bin/env bash
# Smoke-check Easy Rental origin / Cloudflare front door.
set -euo pipefail

BASE="${1:-https://easyrental.space}"
URL="${BASE%/}/api/health"

echo "GET ${URL}"
code="$(curl -fsS -o /tmp/easyrental-health.json -w '%{http_code}' "$URL" || true)"
echo "status=${code}"
if [[ -f /tmp/easyrental-health.json ]]; then
  cat /tmp/easyrental-health.json
  echo
fi
[[ "$code" == "200" ]]
