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
    env: {
      ...process.env,
      CI: "1",
    },
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`HEALTH BANKR: cockpit=${cockpitRel}`);
run("node", ["scripts/check-bankr-ops-lane.mjs"]);
run("node", ["scripts/check-bankr-integrity.mjs"]);
run("npm", ["-C", cockpitRel, "run", "build"]);
run("npx", ["tsc", "--noEmit"], { cwd: cockpitRoot });
run("npm", [
  "-C",
  cockpitRel,
  "run",
  "test",
  "--",
  "tests/bankr-integration.spec.ts",
  "tests/bankr-execution-boundary.spec.ts",
]);
console.log("HEALTH BANKR: PASS");
