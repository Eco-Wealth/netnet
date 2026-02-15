#!/usr/bin/env bash
set -euo pipefail
echo "== netnet: repo root =="
cd "$(dirname "$0")/.."
pwd
echo "== netnet: cockpit install =="
cd netnet/cockpit
node -v
npm -v
npm ci || npm install
echo "== netnet: cockpit build =="
npm run build
echo "== netnet: cockpit lint (optional) =="
npm run lint || true
echo "OK: ops/check.sh complete"