#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);
const intentMapPath = path.join(cockpitRoot, "docs", "openclaw-intent-map.md");

const requiredTokens = [
  "bankr.wallet.read",
  "bankr.token.info",
  "bankr.token.actions",
  "bankr.launch",
  "/api/bankr/wallet",
  "/api/bankr/token/info",
  "/api/bankr/token/actions",
  "/api/bankr/launch",
];

if (!fs.existsSync(intentMapPath)) {
  console.error(`missing OpenClaw intent map: ${intentMapPath}`);
  process.exit(1);
}

const source = fs.readFileSync(intentMapPath, "utf8");
const missing = requiredTokens.filter((token) => !source.includes(token));

console.log("OpenClaw intent map check");
console.log(`- cockpit root: ${toRepoRelative(repoRoot, cockpitRoot)}`);
console.log(`- file: ${toRepoRelative(repoRoot, intentMapPath)}`);

if (missing.length) {
  console.error("- missing required tokens:");
  for (const token of missing) console.error(`  - ${token}`);
  process.exit(1);
}

console.log("- map includes required Bankr intents/actions/routes");
