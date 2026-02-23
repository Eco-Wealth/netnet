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
  actionSchema: path.join(cockpitRoot, "src/lib/bankr/actionSchema.ts"),
  actions: path.join(cockpitRoot, "src/app/operator/actions.ts"),
  operatorClient: path.join(cockpitRoot, "src/app/operator/operator-console-client.tsx"),
  conversation: path.join(cockpitRoot, "src/components/operator/ConversationPanel.tsx"),
  opsBoard: path.join(cockpitRoot, "src/components/operator/OpsBoard.tsx"),
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
const actionSchemaSrc = read(files.actionSchema);
const actionsSrc = read(files.actions);
const operatorClientSrc = read(files.operatorClient);
const conversationSrc = read(files.conversation);
const opsBoardSrc = read(files.opsBoard);
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

check(function bankr_action_schema_enforces_canonical_payload_validation() {
  mustContain(
    actionSchemaSrc,
    /BANKR_ACTION_ROUTE_MAP/,
    "bankr action route map exists"
  );
  mustContain(
    actionSchemaSrc,
    /validateBankrActionPayload\(/,
    "bankr action payload validator exists"
  );
  mustContain(
    actionSchemaSrc,
    /deriveTokenRouteActionFromPayload\(/,
    "bankr token route-action resolver exists"
  );
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
    /writeExecutionId|writeExecutedAt|writeTxHash|writeProofId/,
    "store execution writes write-execution markers/evidence"
  );
  mustContain(
    storeSrc,
    /executionIdempotencyKey|getBankrExecutionPreflightBundle/,
    "store execution has idempotency + preflight bundle"
  );
  mustContain(
    storeSrc,
    /failureCategory|classifyExecutionFailureMessage/,
    "store execution classifies failures"
  );
}, results);

check(function operator_actions_include_bankr_preflight_lane() {
  mustContain(
    actionsSrc,
    /export async function runBankrPreflightAction\(/,
    "operator actions export runBankrPreflightAction"
  );
  mustContain(
    actionsSrc,
    /export async function runBankrPreflightSweepAction\(/,
    "operator actions export runBankrPreflightSweepAction"
  );
  mustContain(
    actionsSrc,
    /export async function runBankrPlanSweepAction\(/,
    "operator actions export runBankrPlanSweepAction"
  );
  mustContain(
    actionsSrc,
    /export async function runBankrPrepSweepAction\(/,
    "operator actions export runBankrPrepSweepAction"
  );
  mustContain(
    actionsSrc,
    /bankr\.preflight/,
    "operator actions write bankr.preflight audit action"
  );
  mustContain(
    actionsSrc,
    /bankr\.preflight\.sweep/,
    "operator actions write bankr.preflight.sweep audit action"
  );
  mustContain(
    actionsSrc,
    /bankr\.plan\.sweep/,
    "operator actions write bankr.plan.sweep audit action"
  );
  mustContain(
    actionsSrc,
    /bankr\.prep\.sweep/,
    "operator actions write bankr.prep.sweep audit action"
  );
}, results);

check(function conversation_surface_shows_preflight_and_failure_details() {
  mustContain(
    conversationSrc,
    /readProposalPreflight\(/,
    "conversation parses proposal preflight metadata"
  );
  mustContain(
    conversationSrc,
    /Preflight/,
    "conversation surfaces preflight button/panel labels"
  );
  mustContain(
    conversationSrc,
    /failureCategory/,
    "conversation surfaces failure category"
  );
  mustContain(
    conversationSrc,
    /Run Preflight first\./,
    "conversation execute gate surfaces preflight-first guidance"
  );
}, results);

check(function operator_surface_wires_preflight_sweep_controls() {
  mustContain(
    operatorClientSrc,
    /runBankrPreflightSweepAction/,
    "operator client imports/wires preflight sweep action"
  );
  mustContain(
    operatorClientSrc,
    /onRunPreflightSweep=/,
    "operator client passes onRunPreflightSweep prop"
  );
  mustContain(
    operatorClientSrc,
    /onRunPlanSweep=/,
    "operator client passes onRunPlanSweep prop"
  );
  mustContain(
    operatorClientSrc,
    /onRunPrepSweep=/,
    "operator client passes onRunPrepSweep prop"
  );
  mustContain(
    opsBoardSrc,
    /Preflight Sweep/,
    "ops board renders preflight sweep control"
  );
  mustContain(
    opsBoardSrc,
    /Generate Plans/,
    "ops board renders plan sweep control"
  );
  mustContain(
    opsBoardSrc,
    /Prep Sweep/,
    "ops board renders prep sweep control"
  );
  mustContain(
    opsBoardSrc,
    /Preflight blockers/,
    "ops board renders preflight blockers list"
  );
  mustContain(
    opsBoardSrc,
    /Plan blockers/,
    "ops board renders plan blockers list"
  );
  mustContain(
    opsBoardSrc,
    /Execution-ready Bankr/,
    "ops board renders execution-ready bankr list"
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
  mustContain(
    executorSrc,
    /executionIdempotencyKey|failureCategory/,
    "executor includes idempotency and failure category support"
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
