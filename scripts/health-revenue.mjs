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

console.log(`HEALTH REVENUE: cockpit=${cockpitRel}`);
run("node", ["scripts/check-revenue-contract.mjs"]);
run("node", ["scripts/check-service-connector-matrix.mjs"]);
run("node", ["scripts/check-openclaw-intent-map.mjs"]);
console.log("HEALTH REVENUE: PASS");
