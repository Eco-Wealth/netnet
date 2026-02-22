#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const files = {
  workLib: path.join(cockpitRoot, "src", "lib", "work.ts"),
  operatorDb: path.join(cockpitRoot, "src", "lib", "operator", "db.ts"),
  workApiList: path.join(cockpitRoot, "src", "app", "api", "work", "route.ts"),
  workApiItem: path.join(cockpitRoot, "src", "app", "api", "work", "[id]", "route.ts"),
  proofPanel: path.join(cockpitRoot, "src", "app", "proof", "ProofObjectPanel.tsx"),
  distributePage: path.join(cockpitRoot, "src", "app", "distribute", "page.tsx"),
  workListPage: path.join(cockpitRoot, "src", "app", "work", "page.tsx"),
  workDetailPage: path.join(cockpitRoot, "src", "app", "work", "[id]", "page.tsx"),
};

const checks = [
  {
    label: "work library persists records",
    ok:
      exists(files.workLib) &&
      read(files.workLib).includes("saveWorkItemRecord"),
  },
  {
    label: "operator db defines work_items table",
    ok:
      exists(files.operatorDb) &&
      read(files.operatorDb).includes("CREATE TABLE IF NOT EXISTS work_items"),
  },
  {
    label: "work list API supports proof filters",
    ok:
      exists(files.workApiList) &&
      read(files.workApiList).includes("hasProof") &&
      read(files.workApiList).includes("proofId"),
  },
  {
    label: "work item API allows PROOF_ATTACHED events",
    ok:
      exists(files.workApiItem) &&
      read(files.workApiItem).includes('"PROOF_ATTACHED"'),
  },
  {
    label: "proof panel can create work from proof",
    ok:
      exists(files.proofPanel) &&
      read(files.proofPanel).includes("Create Work Item"),
  },
  {
    label: "distribute page includes create work lane",
    ok:
      exists(files.distributePage) &&
      read(files.distributePage).includes("createWorkFromProof"),
  },
  {
    label: "work list page has URL-synced proof filters",
    ok:
      exists(files.workListPage) &&
      read(files.workListPage).includes("history.replaceState") &&
      read(files.workListPage).includes("proofId"),
  },
  {
    label: "work detail page exists with status transitions",
    ok:
      exists(files.workDetailPage) &&
      read(files.workDetailPage).includes("STATUS_TRANSITIONS") &&
      read(files.workDetailPage).includes("Mark "),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("Proof-Work integrity check");
console.log(`- cockpit root: ${toRepoRelative(repoRoot, cockpitRoot)}`);
for (const check of checks) {
  console.log(`- ${check.ok ? "ok" : "fail"}: ${check.label}`);
}

if (failed.length > 0) {
  process.exit(1);
}
