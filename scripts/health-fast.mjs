#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);
const cockpitRel = toRepoRelative(repoRoot, cockpitRoot);

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`HEALTH FAST: cockpit=${cockpitRel}`);
run("npm", ["-C", cockpitRel, "run", "build"]);
run("npx", ["tsc", "--noEmit"], { cwd: cockpitRoot });
run("node", ["scripts/check-api-contract-sot.mjs"]);
run("node", ["scripts/check-policy-integrity.mjs"]);
run("node", ["scripts/check-route-policy-enforcement.mjs"]);
run("node", ["scripts/check-proof-lane.mjs"]);
run("node", ["scripts/check-service-connector-health.mjs"]);
run("node", ["scripts/check-mcp-connectors.mjs"]);
console.log("HEALTH FAST: PASS");
