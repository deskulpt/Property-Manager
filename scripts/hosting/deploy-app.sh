#!/usr/bin/env bash
# Deploy Easy Rental app tree to OCI origin over SSH.
# Usage: OCI_SSH=ubuntu@x.x.x.x ./scripts/hosting/deploy-app.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
: "${OCI_SSH:?Set OCI_SSH=user@oci-public-ip}"

REMOTE_APP="${REMOTE_APP:-/opt/easyrental/app}"
REMOTE_USER_SERVICE="${REMOTE_USER_SERVICE:-easyrental}"

echo "Building locally…"
cd "$ROOT"
npm ci
npm run build

echo "Syncing to ${OCI_SSH}:${REMOTE_APP}"
ssh "$OCI_SSH" "sudo mkdir -p ${REMOTE_APP} && sudo chown -R \$(whoami):\$(whoami) /opt/easyrental"

rsync -az --delete \
  --exclude '.git' \
  --exclude 'data/' \
  --exclude 'node_modules/' \
  --exclude '.env*' \
  "$ROOT/" "${OCI_SSH}:${REMOTE_APP}/"

ssh "$OCI_SSH" bash -s <<EOF
set -euo pipefail
cd ${REMOTE_APP}
npm ci --omit=dev
sudo cp ${REMOTE_APP}/deploy/oci/easyrental.service /etc/systemd/system/easyrental.service
sudo systemctl daemon-reload
sudo systemctl enable easyrental.service
sudo systemctl restart easyrental.service
sudo systemctl --no-pager --full status easyrental.service | head -n 20
EOF

echo "Deployed. Health: ./scripts/hosting/verify-health.sh http://${OCI_SSH#*@}:43123"
echo "After DNS: ./scripts/hosting/verify-health.sh https://easyrental.space"
echo "ca-pay stub OFF; in-pay PARKED — no payment-plane DNS created."
