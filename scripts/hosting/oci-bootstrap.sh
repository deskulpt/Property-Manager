#!/usr/bin/env bash
# Bootstrap Oracle Always Free Canada VM for Easy Rental Node/SQLite origin.
# Canada-first (ca-toronto-1). PARK India — do not use for ap-mumbai-1 launch.
# Run on the VM after Aloke provisions it (SSH as ubuntu/opc with sudo).
set -euo pipefail

APP_USER="${APP_USER:-easyrental}"
APP_ROOT="${APP_ROOT:-/opt/easyrental}"
DATA_ROOT="${DATA_ROOT:-/data}"
NODE_MAJOR="${NODE_MAJOR:-22}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Re-run with sudo." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git jq ufw build-essential python3

if ! command -v node >/dev/null || [[ "$(node -v | sed 's/v//;s/\..*//')" != "$NODE_MAJOR" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_ROOT" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$DATA_ROOT/uploads" "$APP_ROOT/app" /etc/easyrental
chown -R "$APP_USER:$APP_USER" "$DATA_ROOT" "$APP_ROOT"

if [[ ! -f /etc/easyrental/production.env ]]; then
  if [[ -f "$APP_ROOT/app/deploy/oci/production.env.example" ]]; then
    cp "$APP_ROOT/app/deploy/oci/production.env.example" /etc/easyrental/production.env
  else
    cat >/etc/easyrental/production.env <<'EOF'
NODE_ENV=production
HOSTED=1
PORT=43123
DESKULPT_SECRET_KEY=REPLACE_ME_MIN_16_CHARS
DESKULPT_DB_PATH=/data/deskulpt.sqlite
DESKULPT_DEMO_SWITCHER=0
EASYRENTAL_FLAG_CA_PAY=0
EASYRENTAL_FLAG_IN_PAY=0
BILLING_PROVIDER=demo
EOF
  fi
  chmod 640 /etc/easyrental/production.env
  chown root:"$APP_USER" /etc/easyrental/production.env
  echo "Edit /etc/easyrental/production.env and set DESKULPT_SECRET_KEY before starting."
fi

# Open HTTP/S; prefer restricting to Cloudflare IPs later.
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

echo "Bootstrap complete. Next: scripts/hosting/deploy-app.sh then enable systemd unit from deploy/oci/easyrental.service"
node -v
npm -v
