#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COCKPIT_DIR="$REPO_ROOT/netnet/cockpit"
if [[ ! -d "$COCKPIT_DIR" ]]; then
  echo "missing cockpit app directory" >&2
  exit 1
fi

cd "$COCKPIT_DIR"
npm ci
npm run build

echo "NETNET HEALTHY"
