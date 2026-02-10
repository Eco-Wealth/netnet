#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

CARBON="$ROOT/netnet/cockpit/src/app/api/agent/carbon/route.ts"
REVENUE="$ROOT/netnet/cockpit/src/lib/revenue/index.ts"
LAUNCHER="$ROOT/netnet/cockpit/src/lib/bankr/launcher.ts"

echo "Unit B apply script"
echo "Repo root: $ROOT"

# 1) Carbon route.ts malformed import block fix:
# Replace: '
import {\nimport ' -> '
import '
if [[ -f "$CARBON" ]]; then
  perl -0777 -i -pe 's/\nimport\s*\{\s*\nimport /\nimport /g' "$CARBON"
  echo "✓ Patched carbon route import block: $CARBON"
else
  echo "⚠ Missing file: $CARBON"
fi

# 2) Revenue module missing incentives import fix:
# - Replace "@/lib/incentives" -> "@/lib/economics"
# - Replace readIncentivesConfig -> getIncentiveBpsConfig
# - Replace 'await readIncentivesConfig().catch(...)' with 'getIncentiveBpsConfig()'
if [[ -f "$REVENUE" ]]; then
  perl -i -pe 's#@/lib/incentives#@/lib/economics#g' "$REVENUE"
  perl -i -pe 's/\breadIncentivesConfig\b/getIncentiveBpsConfig/g' "$REVENUE"
  perl -0777 -i -pe 's/\bconst\s+incentives\s*=\s*await\s+getIncentiveBpsConfig\(\)\s*\.catch\([^;]*\);/  const incentives = getIncentiveBpsConfig();/gms' "$REVENUE"
  echo "✓ Patched revenue incentives import/symbol: $REVENUE"
else
  echo "⚠ Missing file: $REVENUE"
fi

# 3) Bankr launcher missing http/env exports fix:
# - import { httpJson } from "@/lib/http" -> import { fetchJson } from "@/lib/http"
# - delete env import line
# - env().BANKR_API_BASE_URL -> process.env.BANKR_API_BASE_URL?.trim()
# - httpJson( -> fetchJson(
if [[ -f "$LAUNCHER" ]]; then
  perl -i -pe 's/import\s*\{\s*httpJson\s*\}\s*from\s*"@\/lib\/http"\s*;/import { fetchJson } from "@\/lib\/http";/g' "$LAUNCHER"
  perl -i -pe 's/^import\s*\{\s*env\s*\}\s*from\s*"@\/lib\/env"\s*;\s*$\n//mg' "$LAUNCHER"
  perl -i -pe 's/\benv\(\)\.BANKR_API_BASE_URL\b/process.env.BANKR_API_BASE_URL?.trim()/g' "$LAUNCHER"
  perl -i -pe 's/\bhttpJson\s*\(/fetchJson(/g' "$LAUNCHER"
  echo "✓ Patched bankr launcher imports/env/http: $LAUNCHER"
else
  echo "⚠ Missing file: $LAUNCHER"
fi

echo
echo "Done. Next steps:"
echo "  (1) cd $ROOT/netnet/cockpit && npm run dev"
echo "  (2) If build still errors, copy/paste the exact first error line and file path."
