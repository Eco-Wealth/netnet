import crypto from "crypto";
import type { DecideInput, Decision } from "./types";
import { loadPolicyConfig } from "./config";
import { getProgramStatus, pauseProgram } from "./circuitBreaker";

function cid() {
  return crypto.randomBytes(8).toString("hex");
}

export function decide(input: DecideInput): Decision {
  const correlationId = cid();
  const cfg = loadPolicyConfig();
  const program = cfg.programs[input.programId];

  const reasons: string[] = [];
  const limitsApplied: Record<string, any> = {};

  if (!program) {
    return {
      allowed: false,
      mode: "BLOCK",
      reasons: ["unknown_program"],
      limitsApplied,
      correlationId,
      programId: input.programId,
      action: input.action,
    };
  }

  const status = getProgramStatus(program.id, program.anomalies.windowSeconds);
  if (status.paused) {
    return {
      allowed: false,
      mode: "BLOCK",
      reasons: ["program_paused"],
      limitsApplied: { pausedUntil: status.pausedUntil, lastAnomaly: status.lastAnomaly },
      correlationId,
      programId: program.id,
      action: input.action,
      nextAction: "POST /api/policy {action:'resume', programId} if safe",
    };
  }

  if (input.chain && !program.allow.chains.includes(input.chain)) reasons.push("chain_not_allowed");
  if (input.token && !program.allow.tokens.includes(input.token)) reasons.push("token_not_allowed");
  if (input.venue && !program.allow.venues.includes(input.venue)) reasons.push("venue_not_allowed");
  if (!program.allow.actions.includes(input.action)) reasons.push("action_not_allowed");

  const slippage = input.slippageBps ?? 0;
  const gasUsd = input.gasUsd ?? 0;
  const retries = input.retries ?? 0;

  if (slippage > program.anomalies.maxSlippageBps) {
    reasons.push("slippage_anomaly");
    limitsApplied.maxSlippageBps = program.anomalies.maxSlippageBps;
    pauseProgram(program.id, 15 * 60, `slippage_bps=${slippage}`);
    limitsApplied.circuitBreaker = "paused_15m";
  }
  if (gasUsd > program.anomalies.maxGasUsd) {
    reasons.push("gas_anomaly");
    limitsApplied.maxGasUsd = program.anomalies.maxGasUsd;
    pauseProgram(program.id, 15 * 60, `gas_usd=${gasUsd}`);
    limitsApplied.circuitBreaker = "paused_15m";
  }
  if (retries > program.anomalies.maxRetries) {
    reasons.push("retry_anomaly");
    limitsApplied.maxRetries = program.anomalies.maxRetries;
    pauseProgram(program.id, 15 * 60, `retries=${retries}`);
    limitsApplied.circuitBreaker = "paused_15m";
  }

  const spendUsd = input.spendUsd ?? 0;
  if (spendUsd > program.budgets.usdPerRun) {
    reasons.push("budget_exceeds_usdPerRun");
    limitsApplied.usdPerRun = program.budgets.usdPerRun;
  }

  let mode: Decision["mode"] = "ALLOW";
  if (program.autonomy === "READ_ONLY") mode = "BLOCK";
  if (program.autonomy === "PROPOSE_ONLY") mode = "REQUIRE_APPROVAL";
  if (program.autonomy === "EXECUTE_WITH_LIMITS") mode = "REQUIRE_APPROVAL";
  if (program.autonomy === "AUTONOMOUS_PROGRAMS") mode = "ALLOW";

  if (reasons.length) mode = "BLOCK";

  return {
    allowed: mode !== "BLOCK",
    mode,
    reasons,
    limitsApplied,
    correlationId,
    programId: program.id,
    action: input.action,
    nextAction:
      mode === "REQUIRE_APPROVAL"
        ? "Render approval UI; then POST to execution endpoint with approval receipt"
        : mode === "ALLOW"
        ? "Proceed"
        : "Adjust inputs or policy",
  };
}
