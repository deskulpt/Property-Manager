#!/usr/bin/env bash
# Rebuild packages/easyrent-wasm from crates/easyrent-wasm (nodejs + bundler).
# Requires: rustup target wasm32-unknown-unknown, wasm-pack.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "wasm-pack not found. Install: cargo install wasm-pack --locked" >&2
  exit 1
fi

rustup target add wasm32-unknown-unknown >/dev/null

wasm-pack build crates/easyrent-wasm \
  --target nodejs \
  --out-dir ../../packages/easyrent-wasm/node \
  --release

wasm-pack build crates/easyrent-wasm \
  --target bundler \
  --out-dir ../../packages/easyrent-wasm/bundler \
  --release

# wasm-pack writes a blanket .gitignore; we commit the pkgs for zero-Rust deploys.
rm -f packages/easyrent-wasm/node/.gitignore packages/easyrent-wasm/bundler/.gitignore

echo "OK → packages/easyrent-wasm/{node,bundler}"
