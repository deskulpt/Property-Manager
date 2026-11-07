#!/usr/bin/env bash
# Apply apex + www DNS for easyrental.space in the dedicated EasyRental CF account.
# Dry-run by default. Never creates in-pay / ca-pay unless explicitly forced (still refused if flags OFF).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DNS_JSON="${ROOT}/deploy/cloudflare/dns-records.json"
ACCOUNT_ID="b2c682e130b734a072424bbf92367668"
ZONE_NAME="easyrental.space"
DRY_RUN=1
APPLY_MAIL=0
ALLOW_RESERVED_PAY_DNS=0

usage() {
  cat <<EOF
Usage: $0 [--apply] [--with-mail] [--allow-reserved-pay-dns]

  Default is dry-run (prints planned records).
  Requires: curl, jq
  Auth: CLOUDFLARE_API_TOKEN with Zone.DNS Edit on account ${ACCOUNT_ID}

Env:
  OCI_PUBLIC_IPV4   required for A record
  OCI_PUBLIC_IPV6   optional for AAAA
  EASYRENTAL_FLAG_IN_PAY  must be 0/empty to refuse in-pay
  EASYRENTAL_FLAG_CA_PAY  must be 0/empty to refuse ca-pay
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) DRY_RUN=0; shift ;;
    --with-mail) APPLY_MAIL=1; shift ;;
    --allow-reserved-pay-dns) ALLOW_RESERVED_PAY_DNS=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

need() { command -v "$1" >/dev/null || { echo "missing: $1" >&2; exit 1; }; }
need jq
need curl

echo "== EasyRental CF DNS =="
echo "account=${ACCOUNT_ID} zone=${ZONE_NAME}"
echo "source=${DNS_JSON}"
echo "dry_run=${DRY_RUN}"

if [[ -z "${OCI_PUBLIC_IPV4:-}" ]]; then
  echo "OCI_PUBLIC_IPV4 unset — cannot plan apex A record. Set it after Aloke provisions OCI." >&2
  if [[ "$DRY_RUN" -eq 0 ]]; then
    exit 1
  fi
fi

IN_PAY_FLAG="${EASYRENTAL_FLAG_IN_PAY:-0}"
CA_PAY_FLAG="${EASYRENTAL_FLAG_CA_PAY:-0}"

plan_record() {
  local name="$1" type="$2" content="$3" proxied="$4"
  echo "PLAN ${type} ${name} -> ${content} proxied=${proxied}"
}

# Reserved names: always refuse unless both allow-flag AND compliance ON
refuse_reserved() {
  local name="$1" flag_val="$2" flag_name="$3"
  if [[ "$ALLOW_RESERVED_PAY_DNS" -eq 1 && "$flag_val" == "1" ]]; then
    echo "WARN: reserved ${name} allowed by override + ${flag_name}=1 — still not auto-created by this script (separate service)." >&2
    return 0
  fi
  echo "SKIP reserved ${name} (${flag_name}=${flag_val}; create only when Admin toggle ON + dedicated service ready)"
}

refuse_reserved "in-pay" "$IN_PAY_FLAG" "in-pay/EASYRENTAL_FLAG_IN_PAY"
refuse_reserved "ca-pay" "$CA_PAY_FLAG" "ca-pay/EASYRENTAL_FLAG_CA_PAY"

if [[ -n "${OCI_PUBLIC_IPV4:-}" ]]; then
  plan_record "@" "A" "$OCI_PUBLIC_IPV4" "true"
fi
if [[ -n "${OCI_PUBLIC_IPV6:-}" ]]; then
  plan_record "@" "AAAA" "$OCI_PUBLIC_IPV6" "true"
fi
plan_record "www" "CNAME" "easyrental.space" "true"

if [[ "$APPLY_MAIL" -eq 1 ]]; then
  echo "MAIL: enable MX/SPF/DKIM from dns-records.json mailWhenSendingEnabled — edit placeholders first."
  jq -r '.records.mailWhenSendingEnabled[] | "PLAN \(.type) \(.name) -> \(.content) enabled=\(.enabled)"' "$DNS_JSON"
else
  echo "SKIP mail records (pass --with-mail only after Resend/SES domain setup)"
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry-run only. Re-run with --apply CLOUDFLARE_API_TOKEN=… OCI_PUBLIC_IPV4=… after OCI exists."
  exit 0
fi

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN required for --apply}"

api() {
  local method="$1" path="$2" data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -fsS -X "$method" "https://api.cloudflare.com/client/v4${path}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$data"
  else
    curl -fsS -X "$method" "https://api.cloudflare.com/client/v4${path}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json"
  fi
}

ZONE_ID="$(api GET "/zones?name=${ZONE_NAME}&account.id=${ACCOUNT_ID}" | jq -r '.result[0].id // empty')"
if [[ -z "$ZONE_ID" ]]; then
  echo "Zone ${ZONE_NAME} not found in account ${ACCOUNT_ID}. Confirm dedicated EasyRental CF account." >&2
  exit 1
fi
echo "zone_id=${ZONE_ID}"

upsert() {
  local name="$1" type="$2" content="$3" proxied="$4"
  local fqdn="$name"
  if [[ "$name" == "@" ]]; then
    fqdn="$ZONE_NAME"
  elif [[ "$name" != *.* ]]; then
    fqdn="${name}.${ZONE_NAME}"
  fi
  local existing
  existing="$(api GET "/zones/${ZONE_ID}/dns_records?type=${type}&name=${fqdn}" | jq -r '.result[0].id // empty')"
  local body
  body="$(jq -n --arg type "$type" --arg name "$fqdn" --arg content "$content" --argjson proxied "$proxied" \
    '{type:$type,name:$name,content:$content,proxied:$proxied,ttl:1}')"
  if [[ -n "$existing" ]]; then
    echo "UPDATE ${type} ${fqdn}"
    api PUT "/zones/${ZONE_ID}/dns_records/${existing}" "$body" >/dev/null
  else
    echo "CREATE ${type} ${fqdn}"
    api POST "/zones/${ZONE_ID}/dns_records" "$body" >/dev/null
  fi
}

upsert "@" "A" "$OCI_PUBLIC_IPV4" true
if [[ -n "${OCI_PUBLIC_IPV6:-}" ]]; then
  upsert "@" "AAAA" "$OCI_PUBLIC_IPV6" true
fi
upsert "www" "CNAME" "easyrental.space" true

echo "Done. Verify: ./scripts/hosting/verify-health.sh https://easyrental.space"
echo "Reserved in-pay/ca-pay were NOT created."
