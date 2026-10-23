#!/usr/bin/env bash
# Optional: download buildingSMART Duplex Apartment IFC (CC BY 4.0) for local IFC demos.
# Attribute buildingSMART International. Not required for npm run reset (GLB seed ships in-repo).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/data/samples"
mkdir -p "$DEST"
URL="https://raw.githubusercontent.com/buildingsmart-community/Community-Sample-Test-Files/main/IFC%202.3.0.1%20(IFC%202x3)/Duplex%20Apartment/Duplex_A_20110907.ifc"
OUT="$DEST/duplex-apartment.ifc"
echo "Fetching Duplex IFC → $OUT"
curl -fsSL "$URL" -o "$OUT"
echo "Done. Upload from landlord Building visuals, or copy into an ObjectStore put for tests."
echo "Attribute: buildingSMART International (CC BY 4.0)."
