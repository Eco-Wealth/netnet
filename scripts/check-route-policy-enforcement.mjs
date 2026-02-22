#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);

const requiredRoutes = [
  "src/app/api/agent/trade/route.ts",
  "src/app/api/agent/carbon/route.ts",
  "src/app/api/bridge/quote/route.ts",
  "src/app/api/bridge/retire/route.ts",
  "src/app/api/bankr/launch/route.ts",
  "src/app/api/bankr/token/actions/route.ts",
  "src/app/api/bankr/token/info/route.ts",
  "src/app/api/bankr/wallet/route.ts",
];

const routes = [...requiredRoutes].sort();

function hasRouteGuard(src) {
  const hasPolicyGate = src.includes("enforcePolicy(");
  const hasProposeOnlyOrDryRun =
    src.includes("PROPOSE_ONLY") ||
    src.includes("requiresApproval") ||
    src.includes("DRY_RUN");
  const isReadOnlyGetRoute =
    src.includes("export async function GET") &&
    !src.includes("export async function POST");
  const hasInputValidation =
    src.includes("safeParse(") ||
    src.includes("INVALID_BODY") ||
    src.includes("Missing required field") ||
    src.includes("amount must be a positive number");
  return (
    hasPolicyGate ||
    hasProposeOnlyOrDryRun ||
    isReadOnlyGetRoute ||
    hasInputValidation
  );
}

const missing = [];
for (const rel of routes) {
  const abs = path.join(cockpitRoot, rel);
  if (!fs.existsSync(abs)) {
    missing.push(`${rel} (file missing)`);
    continue;
  }
  const src = fs.readFileSync(abs, "utf8");
  if (!hasRouteGuard(src)) {
    missing.push(rel);
  }
}

console.log("Route policy enforcement check");
console.log(`- cockpit root: ${toRepoRelative(repoRoot, cockpitRoot)}`);
console.log(`- checked routes: ${routes.length}`);

if (missing.length) {
  console.log("- missing route guard markers:");
  for (const m of missing) console.log(`  - ${m}`);
  process.exit(1);
}

console.log("- all required routes include recognized guard markers");
