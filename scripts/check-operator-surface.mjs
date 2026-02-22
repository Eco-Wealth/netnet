#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);

const files = {
  consoleClient: path.join(cockpitRoot, "src", "app", "operator", "operator-console-client.tsx"),
  conversation: path.join(cockpitRoot, "src", "components", "operator", "ConversationPanel.tsx"),
  opsBoard: path.join(cockpitRoot, "src", "components", "operator", "OpsBoard.tsx"),
  topBar: path.join(cockpitRoot, "src", "components", "operator", "OperatorTopBar.tsx"),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    console.error(`missing operator file (${label}): ${file}`);
    process.exit(1);
  }
}

const conversationSource = fs.readFileSync(files.conversation, "utf8");
const opsBoardSource = fs.readFileSync(files.opsBoard, "utf8");
const topBarSource = fs.readFileSync(files.topBar, "utf8");

const checks = [
  { ok: conversationSource.includes("Load older messages"), label: "thread cap control" },
  { ok: conversationSource.includes("Simulate"), label: "bankr simulate control" },
  { ok: opsBoardSource.includes('title="Now"'), label: "Now section" },
  { ok: opsBoardSource.includes('title="Strategies"'), label: "Strategies section" },
  { ok: opsBoardSource.includes('title="Health"'), label: "Health section" },
  { ok: topBarSource.includes("Operator Seat"), label: "operator top bar title" },
];

const failed = checks.filter((check) => !check.ok);

console.log("Operator surface check");
console.log(`- cockpit root: ${toRepoRelative(repoRoot, cockpitRoot)}`);
for (const check of checks) {
  console.log(`- ${check.ok ? "ok" : "fail"}: ${check.label}`);
}

if (failed.length) {
  process.exit(1);
}
