#!/usr/bin/env bash
set -euo pipefail

BASE="${NETNET_TEST_BASE_URL:-http://localhost:3000}"

echo "UX smoke against: $BASE"
curl -fsS "$BASE/api/health" >/dev/null && echo "OK /api/health"
curl -fsS "$BASE/api/work" >/dev/null && echo "OK /api/work"

echo "Open these in a browser and run the checklist:"
echo "  $BASE/proof"
echo "  $BASE/governance"
echo "  $BASE/work"
echo "  $BASE/workbench"
