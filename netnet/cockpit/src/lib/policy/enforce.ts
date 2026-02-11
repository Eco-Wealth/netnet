import type { PolicyAction } from "./types";

export type EnforcePolicyContext = {
  route?: string;
  chain?: string;
  venue?: string;
  fromToken?: string;
  toToken?: string;
  amountUsd?: number;
};

export type TradePolicyEnvelope = {
  autonomyLevel: "PROPOSE_ONLY";
  allowlists: {
    venues: string[];
    chains: string[];
    tokens: string[];
  };
  caps: {
    maxUsdPerTrade: number;
    maxUsdPerDay: number;
  };
};

export type PolicyDecision = {
  ok: boolean;
  action: PolicyAction;
  mode: "READ_ONLY" | "PROPOSE_ONLY";
  requiresApproval: boolean;
  reasons: string[];
  policy?: TradePolicyEnvelope;
};

const TRADE_POLICY: TradePolicyEnvelope = {
  autonomyLevel: "PROPOSE_ONLY",
  allowlists: {
    venues: ["bankr", "uniswap", "aerodrome"],
    chains: ["base", "ethereum", "polygon", "arbitrum", "optimism", "celo"],
    tokens: ["USDC", "WETH", "REGEN", "K2", "KVCM", "ECO", "ZORA"],
  },
  caps: {
    maxUsdPerTrade: 250,
    maxUsdPerDay: 500,
  },
};

export function tradePolicyEnvelope(): TradePolicyEnvelope {
  return TRADE_POLICY;
}

function gateTrade(action: PolicyAction, context: EnforcePolicyContext): PolicyDecision {
  const reasons: string[] = [];
  const chain = context.chain ?? "";
  const venue = context.venue ?? "";
  const fromToken = context.fromToken ?? "";
  const toToken = context.toToken ?? "";
  const amountUsd = context.amountUsd ?? 0;

  if (chain && !TRADE_POLICY.allowlists.chains.includes(chain)) {
    reasons.push(`chain not allowed: ${chain}`);
  }
  if (venue && !TRADE_POLICY.allowlists.venues.includes(venue)) {
    reasons.push(`venue not allowed: ${venue}`);
  }
  if (fromToken && !TRADE_POLICY.allowlists.tokens.includes(fromToken)) {
    reasons.push(`from token not allowed: ${fromToken}`);
  }
  if (toToken && !TRADE_POLICY.allowlists.tokens.includes(toToken)) {
    reasons.push(`to token not allowed: ${toToken}`);
  }
  if (amountUsd > TRADE_POLICY.caps.maxUsdPerTrade) {
    reasons.push(`amountUsd exceeds maxUsdPerTrade (${TRADE_POLICY.caps.maxUsdPerTrade})`);
  }

  return {
    ok: reasons.length === 0,
    action,
    mode: "PROPOSE_ONLY",
    requiresApproval: true,
    reasons,
    policy: TRADE_POLICY,
  };
}

/**
 * Centralized policy gate for spend-adjacent endpoints.
 * Keep this helper behavior-preserving while routes migrate.
 */
export function enforcePolicy(
  action: PolicyAction,
  context: EnforcePolicyContext = {}
): PolicyDecision {
  if (action === "trade.quote" || action === "trade.plan" || action === "trade.execute") {
    return gateTrade(action, context);
  }

  // Current behavior for non-trade spend-adjacent routes is proposal-first with operator approval.
  return {
    ok: true,
    action,
    mode: "PROPOSE_ONLY",
    requiresApproval: true,
    reasons: [],
  };
}
