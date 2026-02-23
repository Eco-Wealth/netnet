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
  registry: path.join(repoRoot, "skills", "REGISTRY.md"),
  sot: path.join(cockpitRoot, "docs", "api-contract-source-of-truth.json"),
  llm: path.join(cockpitRoot, "src/lib/operator/llm.ts"),
  proposal: path.join(cockpitRoot, "src/lib/operator/proposal.ts"),
  adapter: path.join(cockpitRoot, "src/lib/operator/adapters/bankr.ts"),
  store: path.join(cockpitRoot, "src/lib/operator/store.ts"),
  executor: path.join(cockpitRoot, "src/lib/operator/executor.ts"),
  policyTypes: path.join(cockpitRoot, "src/lib/policy/types.ts"),
  policyEnforce: path.join(cockpitRoot, "src/lib/policy/enforce.ts"),
};

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing file: ${toRepoRelative(repoRoot, filePath)}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function mustContain(src, pattern, why) {
  if (!pattern.test(src)) {
    throw new Error(`missing check: ${why}`);
  }
}

function check(fn, results) {
  try {
    fn();
    results.push({ ok: true, label: fn.name || "check" });
  } catch (error) {
    results.push({
      ok: false,
      label: fn.name || "check",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const registrySrc = read(files.registry);
const llmSrc = read(files.llm);
const proposalSrc = read(files.proposal);
const adapterSrc = read(files.adapter);
const storeSrc = read(files.store);
const executorSrc = read(files.executor);
const policyTypesSrc = read(files.policyTypes);
const policyEnforceSrc = read(files.policyEnforce);
const sot = JSON.parse(read(files.sot));

const canonical = [
  { action: "bankr.wallet.read", route: "/api/bankr/wallet" },
  { action: "bankr.token.info", route: "/api/bankr/token/info" },
  { action: "bankr.token.actions", route: "/api/bankr/token/actions" },
  { action: "bankr.launch", route: "/api/bankr/launch" },
];

const results = [];

check(function registry_contains_canonical_bankr_actions() {
  for (const row of canonical) {
    mustContain(
      registrySrc,
      new RegExp(`${row.action}[\\s\\S]{0,160}${row.route.replace(/\//g, "\\/")}`),
      `${row.action} -> ${row.route} in skills/REGISTRY.md`
    );
  }
}, results);

check(function sot_contains_bankr_routes_with_skill_owner() {
  const routes = Array.isArray(sot?.routes) ? sot.routes : [];
  for (const row of canonical) {
    const entry = routes.find((item) => item?.route === row.route);
    if (!entry) {
      throw new Error(`missing SOT route: ${row.route}`);
    }
    if (typeof entry.skill !== "string" || entry.skill.length === 0) {
      throw new Error(`missing SOT skill owner: ${row.route}`);
    }
  }
}, results);

check(function llm_prompt_contains_canonical_bankr_guidance() {
  for (const row of canonical) {
    mustContain(
      llmSrc,
      new RegExp(`${row.action.replace(/\./g, "\\.")}[\\s\\S]{0,120}${row.route.replace(/\//g, "\\/")}`),
      `${row.action} guidance in llm prompt`
    );
  }
}, results);

check(function proposal_validation_uses_strict_bankr_map() {
  for (const row of canonical) {
    mustContain(
      proposalSrc,
      new RegExp(`"${row.action.replace(/\./g, "\\.")}"\\s*:\\s*"${row.route.replace(/\//g, "\\/")}"`),
      `${row.action} strict map in proposal parser`
    );
  }
}, results);

check(function bankr_adapter_contains_canonical_action_route_map() {
  for (const row of canonical) {
    mustContain(
      adapterSrc,
      new RegExp(`"${row.action.replace(/\./g, "\\.")}"[\\s\\S]{0,120}"${row.route.replace(/\//g, "\\/")}"`),
      `${row.action} map in bankr adapter`
    );
  }
}, results);

check(function execution_store_has_write_confirmation_and_replay_guard() {
  mustContain(
    storeSrc,
    /assertWriteConfirmation\(/,
    "store execution write confirmation guard"
  );
  mustContain(storeSrc, /assertNoWriteReplay\(/, "store execution replay guard");
  mustContain(
    storeSrc,
    /writeExecutionId|writeExecutedAt/,
    "store execution writes write-execution markers"
  );
}, results);

check(function execution_boundary_has_replay_guard() {
  mustContain(
    executorSrc,
    /write_replay_blocked/,
    "executor boundary replay block"
  );
  mustContain(
    executorSrc,
    /metadata\.confirmedWrite/,
    "executor confirmedWrite requirement"
  );
}, results);

check(function policy_types_and_enforce_include_simulation_path() {
  mustContain(
    policyTypesSrc,
    /"bankr\.simulate"/,
    "PolicyAction includes bankr.simulate"
  );
  mustContain(
    policyEnforceSrc,
    /if \(action === "bankr\.simulate"\)/,
    "enforcePolicy special-cases bankr.simulate"
  );
}, results);

const failed = results.filter((row) => !row.ok);

console.log("Bankr integrity check");
console.log(`- cockpit root: ${toRepoRelative(repoRoot, cockpitRoot)}`);
for (const row of results) {
  if (row.ok) {
    console.log(`- ok: ${row.label}`);
  } else {
    console.log(`- fail: ${row.label} (${row.error})`);
  }
}

if (failed.length) {
  process.exit(1);
}
