#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);
const sotPath = path.join(cockpitRoot, "docs", "api-contract-source-of-truth.json");
const revenueRoutePath = path.join(cockpitRoot, "src", "app", "api", "agent", "revenue", "route.ts");

if (!fs.existsSync(sotPath)) {
  console.error(`missing SOT file: ${sotPath}`);
  process.exit(1);
}
if (!fs.existsSync(revenueRoutePath)) {
  console.error(`missing revenue route: ${revenueRoutePath}`);
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(sotPath, "utf8"));
const entries = Array.isArray(source.routes) ? source.routes : [];
const revenueEntry = entries.find((entry) => entry.route === "/api/agent/revenue");

console.log("Revenue contract check");
console.log(`- cockpit root: ${toRepoRelative(repoRoot, cockpitRoot)}`);
console.log(`- SOT file: ${toRepoRelative(repoRoot, sotPath)}`);

if (!revenueEntry) {
  console.error("- missing /api/agent/revenue in SOT");
  process.exit(1);
}

const methods = Array.isArray(revenueEntry.methods) ? revenueEntry.methods : [];
if (!methods.includes("GET") && !methods.includes("POST")) {
  console.error("- /api/agent/revenue is missing GET/POST method in SOT");
  process.exit(1);
}

if (typeof revenueEntry.skill !== "string" || !revenueEntry.skill.trim()) {
  console.error("- /api/agent/revenue is missing skill owner");
  process.exit(1);
}

console.log("- /api/agent/revenue is present with GET/POST + skill owner");
