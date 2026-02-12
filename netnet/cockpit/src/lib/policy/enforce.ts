import { loadPolicyConfig } from "./config";
import { decide, programForAction } from "./decide";
import type {
  EnforcePolicyContext,
  PolicyAction,
  PolicyDecision,
  ProgramPolicy,
  SpendPolicyEnvelope,
} from "./types";

function toEnvelope(program: ProgramPolicy): SpendPolicyEnvelope {
  return {
    autonomyLevel: program.autonomy,
    allowlists: {
      venues: program.allow.venues,
      chains: program.allow.chains,
      tokens: program.allow.tokens,
    },
    caps: {
      maxUsdPerTrade: program.budgets.usdPerRun,
      maxUsdPerDay: program.budgets.usdPerDay,
    },
  };
}

export function tradePolicyEnvelope(): SpendPolicyEnvelope {
  const cfg = loadPolicyConfig();
  return toEnvelope(cfg.programs.TRADING_LOOP);
}

function normalizeTradeReasons(
  reasons: string[],
  context: EnforcePolicyContext,
  policy: SpendPolicyEnvelope
) {
  const out: string[] = [];
  for (const r of reasons) {
    if (r === "chain_not_allowed") {
      out.push(`chain not allowed: ${context.chain ?? ""}`.trim());
      continue;
    }
    if (r === "venue_not_allowed") {
      out.push(`venue not allowed: ${context.venue ?? ""}`.trim());
      continue;
    }
    if (r === "token_not_allowed") {
      out.push(`from token not allowed: ${context.fromToken ?? ""}`.trim());
      continue;
    }
    if (r === "budget_exceeds_usdPerRun") {
      out.push(`amountUsd exceeds maxUsdPerTrade (${policy.caps.maxUsdPerTrade})`);
      continue;
    }
    out.push(r);
  }

  if (
    context.toToken &&
    context.toToken.length > 0 &&
    !policy.allowlists.tokens.includes(context.toToken)
  ) {
    out.push(`to token not allowed: ${context.toToken}`);
  }
  return out;
}

/**
 * Centralized policy gate for spend-adjacent endpoints.
 * Uses the same schema + config + decision engine as lib/policy/decide.ts.
 */
export function enforcePolicy(
  action: PolicyAction,
  context: EnforcePolicyContext = {}
): PolicyDecision {
  // Strategy proposal reuses existing work proposal semantics.
  const effectiveAction: PolicyAction =
    action === "strategy.propose" ? "work.create" : action;
  const cfg = loadPolicyConfig();
  const programId = programForAction(effectiveAction);
  const program = cfg.programs[programId];
  const policy = toEnvelope(program);

  const isTrade =
    effectiveAction === "trade.quote" ||
    effectiveAction === "trade.plan" ||
    effectiveAction === "trade.execute";

  const decision = decide({
    programId,
    action: effectiveAction,
    chain: isTrade ? context.chain : undefined,
    venue: isTrade ? context.venue : undefined,
    token: isTrade ? context.fromToken : undefined,
    spendUsd: isTrade ? context.amountUsd : undefined,
  });

  const reasons = isTrade
    ? normalizeTradeReasons(decision.reasons, context, policy)
    : decision.reasons;

  return {
    ok: decision.mode !== "BLOCK" && reasons.length === 0,
    action,
    mode: program.autonomy === "READ_ONLY" ? "READ_ONLY" : "PROPOSE_ONLY",
    requiresApproval: true,
    reasons,
    policy,
  };
}
