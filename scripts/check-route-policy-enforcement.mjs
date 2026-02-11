#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const requiredRoutes = [
  "netnet/cockpit/src/app/api/agent/trade/route.ts",
  "netnet/cockpit/src/app/api/agent/carbon/route.ts",
  "netnet/cockpit/src/app/api/bridge/quote/route.ts",
  "netnet/cockpit/src/app/api/bridge/retire/route.ts",
];

const bankrDir = path.join(repoRoot, "netnet/cockpit/src/app/api/bankr");

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && ent.name === "route.ts") out.push(p);
  }
  return out;
}

const bankrRoutes = walk(bankrDir).map((abs) => path.relative(repoRoot, abs).split(path.sep).join("/"));
const routes = [...requiredRoutes, ...bankrRoutes].sort();

const missing = [];
for (const rel of routes) {
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) {
    missing.push(`${rel} (file missing)`);
    continue;
  }
  const src = fs.readFileSync(abs, "utf8");
  if (!src.includes("enforcePolicy(")) {
    missing.push(rel);
  }
}

console.log("Route policy enforcement check");
console.log(`- checked routes: ${routes.length}`);

if (missing.length) {
  console.log("- missing enforcePolicy calls:");
  for (const m of missing) console.log(`  - ${m}`);
  process.exit(1);
}

console.log("- all required routes call enforcePolicy");
