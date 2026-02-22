#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -d "$REPO_ROOT/netnet/netnet/cockpit" && -f "$REPO_ROOT/netnet/netnet/cockpit/src/app/operator/page.tsx" ]]; then
  COCKPIT_DIR="$REPO_ROOT/netnet/netnet/cockpit"
elif [[ -d "$REPO_ROOT/netnet/cockpit" ]]; then
  COCKPIT_DIR="$REPO_ROOT/netnet/cockpit"
else
  echo "missing cockpit app directory" >&2
  exit 1
fi

cd "$COCKPIT_DIR"
npm ci
npm run build

echo "NETNET HEALTHY"
