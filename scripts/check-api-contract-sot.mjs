#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);
const apiRoot = path.join(cockpitRoot, "src", "app", "api");
const sotPath = path.join(cockpitRoot, "docs", "api-contract-source-of-truth.json");
const cockpitRel = toRepoRelative(repoRoot, cockpitRoot);

function resolveReference(ref) {
  const candidates = [
    path.join(repoRoot, ref),
    path.join(cockpitRoot, ref),
  ];
  if (ref.startsWith("netnet/cockpit/")) {
    const stripped = ref.replace(/^netnet\/cockpit\//, "");
    candidates.push(path.join(cockpitRoot, stripped));
    candidates.push(path.join(repoRoot, "netnet", "netnet", "cockpit", stripped));
  }
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(p));
      continue;
    }
    if (entry.isFile() && entry.name === "route.ts") out.push(p);
  }
  return out;
}

function toRoutePath(routeFile) {
  const rel = path.relative(apiRoot, routeFile).split(path.sep).join("/");
  const trimmed = rel.replace(/\/route\.ts$/, "");
  return `/api/${trimmed}`;
}

function assertArray(value, name, route) {
  if (!Array.isArray(value)) return `${route}: '${name}' must be an array`;
  return null;
}

if (!fs.existsSync(sotPath)) {
  console.error(`missing SOT file: ${sotPath}`);
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(sotPath, "utf8"));
const entries = Array.isArray(source.routes) ? source.routes : [];
const routeFiles = walk(apiRoot);
const actualRoutes = routeFiles.map(toRoutePath).sort();
const mappedRoutes = entries.map((e) => e.route).sort();

const actualSet = new Set(actualRoutes);
const mappedSet = new Set(mappedRoutes);

const missingInMap = actualRoutes.filter((r) => !mappedSet.has(r));
const staleInMap = mappedRoutes.filter((r) => !actualSet.has(r));

const dupes = [];
{
  const seen = new Set();
  for (const r of mappedRoutes) {
    if (seen.has(r)) dupes.push(r);
    seen.add(r);
  }
}

const schemaErrors = [];
const badRefs = [];
const missingSkillOwner = [];

for (const entry of entries) {
  if (typeof entry.route !== "string" || !entry.route.startsWith("/api/")) {
    schemaErrors.push(`invalid route key: ${String(entry.route)}`);
    continue;
  }

  const methodsErr = assertArray(entry.methods, "methods", entry.route);
  if (methodsErr) schemaErrors.push(methodsErr);

  const actionsErr = assertArray(entry.actions, "actions", entry.route);
  if (actionsErr) schemaErrors.push(actionsErr);

  if (Array.isArray(entry.methods)) {
    const invalid = entry.methods.filter(
      (m) => !["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"].includes(String(m))
    );
    if (invalid.length) {
      schemaErrors.push(`${entry.route}: invalid methods: ${invalid.join(", ")}`);
    }
  }

  if (typeof entry.skill === "string") {
    const owner = entry.skill.trim();
    if (!owner) {
      missingSkillOwner.push(entry.route);
    } else if (owner !== "platform") {
      const skillPath = resolveReference(owner);
      if (!fs.existsSync(skillPath)) badRefs.push(`${entry.route}: missing skill file ${owner}`);
    }
  } else {
    missingSkillOwner.push(entry.route);
  }

  if (!Array.isArray(entry.docs)) {
    schemaErrors.push(`${entry.route}: 'docs' must be an array`);
  } else {
    for (const doc of entry.docs) {
      if (typeof doc !== "string") {
        schemaErrors.push(`${entry.route}: non-string doc reference`);
        continue;
      }
      const docPath = resolveReference(doc);
      if (!fs.existsSync(docPath)) badRefs.push(`${entry.route}: missing doc file ${doc}`);
    }
  }
}

console.log("API contract SOT check");
console.log(`- cockpit root: ${cockpitRel}`);
console.log(`- route files: ${actualRoutes.length}`);
console.log(`- mapped routes: ${entries.length}`);
console.log(`- missing skill owners: ${missingSkillOwner.length}`);

if (missingSkillOwner.length) {
  console.error("- missing skill owners (use a skill path or 'platform'):");
  for (const route of missingSkillOwner) console.error(`  - ${route}`);
}

if (missingInMap.length) {
  console.error("- missing in SOT:");
  for (const route of missingInMap) console.error(`  - ${route}`);
}
if (staleInMap.length) {
  console.error("- stale in SOT:");
  for (const route of staleInMap) console.error(`  - ${route}`);
}
if (dupes.length) {
  console.error("- duplicate routes in SOT:");
  for (const route of dupes) console.error(`  - ${route}`);
}
if (schemaErrors.length) {
  console.error("- schema errors:");
  for (const err of schemaErrors) console.error(`  - ${err}`);
}
if (badRefs.length) {
  console.error("- broken references:");
  for (const err of badRefs) console.error(`  - ${err}`);
}

const hasHardErrors =
  missingInMap.length > 0 ||
  staleInMap.length > 0 ||
  dupes.length > 0 ||
  schemaErrors.length > 0 ||
  badRefs.length > 0 ||
  missingSkillOwner.length > 0;

process.exit(hasHardErrors ? 1 : 0);
