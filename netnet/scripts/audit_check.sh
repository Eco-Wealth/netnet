#!/usr/bin/env bash
set -euo pipefail
BASE="${NETNET_TEST_BASE_URL:-http://localhost:3000}"

echo "Checking: $BASE/api/health"
curl -fsS "$BASE/api/health" | head -c 500 && echo

echo "Checking: $BASE/api/security/audit"
# if audit route exists; don't fail hard if missing
if curl -fsS "$BASE/api/security/audit" >/dev/null 2>&1; then
  curl -fsS "$BASE/api/security/audit" | head -c 2000 && echo
else
  echo "Audit endpoint not reachable (ok if not implemented yet)."
fi

echo "Checking: $BASE/api/policy"
if curl -fsS "$BASE/api/policy" >/dev/null 2>&1; then
  curl -fsS "$BASE/api/policy" | head -c 2000 && echo
else
  echo "Policy endpoint not reachable (ok if not implemented yet)."
fi
