#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);
const matrixPath = path.join(cockpitRoot, "docs", "service-connector-matrix.md");

const requiredRows = [
  "/api/bankr/wallet",
  "/api/bankr/token/info",
  "/api/bankr/token/actions",
  "/api/bankr/launch",
  "/api/telegram/webhook",
  "/api/bridge/quote",
  "/api/bridge/retire",
  "/api/proof/feed",
];

if (!fs.existsSync(matrixPath)) {
  console.error(`missing service connector matrix: ${matrixPath}`);
  process.exit(1);
}

const source = fs.readFileSync(matrixPath, "utf8");
const missing = requiredRows.filter((row) => !source.includes(row));

console.log("Service connector matrix check");
console.log(`- cockpit root: ${toRepoRelative(repoRoot, cockpitRoot)}`);
console.log(`- file: ${toRepoRelative(repoRoot, matrixPath)}`);

if (missing.length) {
  console.error("- missing connector rows:");
  for (const row of missing) console.error(`  - ${row}`);
  process.exit(1);
}

console.log("- matrix covers required connectors");
