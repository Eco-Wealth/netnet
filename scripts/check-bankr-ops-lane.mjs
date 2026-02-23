#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);

const commandsPath = path.join(cockpitRoot, "src", "app", "ops", "control", "commands.ts");
const actionsPath = path.join(cockpitRoot, "src", "app", "ops", "control", "actions.ts");
const clientPath = path.join(
  cockpitRoot,
  "src",
  "app",
  "ops",
  "control",
  "control-center-client.tsx"
);

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing file: ${toRepoRelative(repoRoot, filePath)}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertTokens(label, source, tokens) {
  const missing = tokens.filter((token) => !source.includes(token));
  if (missing.length === 0) return { ok: true, missing: [] };
  return { ok: false, missing: missing.map((token) => `${label}:${token}`) };
}

const commandsSource = read(commandsPath);
const actionsSource = read(actionsPath);
const clientSource = read(clientPath);

const checks = [
  assertTokens("commands", commandsSource, [
    'id: "bankr_readiness"',
    'id: "bankr_smoke"',
    '"bankr:check"',
    '"health:bankr"',
  ]),
  assertTokens("actions", actionsSource, [
    "export async function runBankrReadinessCheckAction",
    "export async function runBankrBootstrapAction",
    'commandId: "bankr_smoke"',
  ]),
  assertTokens("client", clientSource, [
    "function BankrReadinessPanel",
    "runBankrReadinessCheckAction",
    "runBankrBootstrapAction",
    "Run full Bankr bootstrap",
  ]),
];

const missing = checks.flatMap((check) => check.missing);

console.log("Bankr ops lane check");
console.log(`- cockpit root: ${toRepoRelative(repoRoot, cockpitRoot)}`);
console.log(`- file: ${toRepoRelative(repoRoot, commandsPath)}`);
console.log(`- file: ${toRepoRelative(repoRoot, actionsPath)}`);
console.log(`- file: ${toRepoRelative(repoRoot, clientPath)}`);

if (missing.length) {
  console.error("- missing required tokens:");
  for (const token of missing) {
    console.error(`  - ${token}`);
  }
  process.exit(1);
}

console.log("- bankr ops readiness + bootstrap lane present");
