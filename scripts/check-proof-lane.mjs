#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);
const cockpitRel = toRepoRelative(repoRoot, cockpitRoot);

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function exists(file) {
  return fs.existsSync(file);
}

const files = {
  proofBuild: path.join(cockpitRoot, "src", "app", "api", "proof", "build", "route.ts"),
  proofVerifyRoute: path.join(
    cockpitRoot,
    "src",
    "app",
    "api",
    "proof",
    "verify",
    "[id]",
    "route.ts"
  ),
  proofFeed: path.join(cockpitRoot, "src", "app", "api", "proof", "feed", "route.ts"),
  proofPanel: path.join(cockpitRoot, "src", "app", "proof", "ProofObjectPanel.tsx"),
  distributePage: path.join(cockpitRoot, "src", "app", "distribute", "page.tsx"),
  workItemCard: path.join(cockpitRoot, "src", "components", "WorkItemCard.tsx"),
  workIdRoute: path.join(cockpitRoot, "src", "app", "api", "work", "[id]", "route.ts"),
  operatorDb: path.join(cockpitRoot, "src", "lib", "operator", "db.ts"),
  sot: path.join(cockpitRoot, "docs", "api-contract-source-of-truth.json"),
};

const checks = [
  {
    label: "proof build route exists",
    ok: exists(files.proofBuild),
  },
  {
    label: "proof build registers proof artifacts",
    ok:
      exists(files.proofBuild) &&
      read(files.proofBuild).includes("registerProofArtifact("),
  },
  {
    label: "proof build returns verify url",
    ok: exists(files.proofBuild) && read(files.proofBuild).includes("verifyUrl"),
  },
  {
    label: "proof verify route exists",
    ok: exists(files.proofVerifyRoute),
  },
  {
    label: "proof feed reads persisted artifacts",
    ok:
      exists(files.proofFeed) &&
      read(files.proofFeed).includes("listProofArtifacts"),
  },
  {
    label: "proof panel create work action",
    ok:
      exists(files.proofPanel) &&
      read(files.proofPanel).includes("Create Work Item"),
  },
  {
    label: "proof panel attach work action",
    ok:
      exists(files.proofPanel) && read(files.proofPanel).includes("Attach Proof"),
  },
  {
    label: "distribute create work action",
    ok:
      exists(files.distributePage) &&
      read(files.distributePage).includes("Create Work"),
  },
  {
    label: "work card proof visibility",
    ok:
      exists(files.workItemCard) &&
      read(files.workItemCard).includes("Proof:"),
  },
  {
    label: "work route allows PROOF_ATTACHED events",
    ok:
      exists(files.workIdRoute) &&
      read(files.workIdRoute).includes('"PROOF_ATTACHED"'),
  },
  {
    label: "operator db proof_records table",
    ok:
      exists(files.operatorDb) &&
      read(files.operatorDb).includes("CREATE TABLE IF NOT EXISTS proof_records"),
  },
  {
    label: "SOT includes /api/proof/verify/[id]",
    ok:
      exists(files.sot) &&
      read(files.sot).includes('"/api/proof/verify/[id]"'),
  },
];

const failed = checks.filter((check) => !check.ok);

console.log("Proof lane check");
console.log(`- cockpit root: ${cockpitRel}`);
for (const check of checks) {
  console.log(`- ${check.ok ? "ok" : "fail"}: ${check.label}`);
}

if (failed.length > 0) process.exit(1);
