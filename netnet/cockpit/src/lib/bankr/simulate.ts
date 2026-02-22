export type SimulationResult = {
  ok: boolean;
  summary: string;
  inputs: Record<string, unknown>;
  steps: string[];
  warnings: string[];
  timestamp: string;
};

type ActionShape = {
  actionId: string;
  route?: string;
  chain: string;
  token: string;
  amount?: number;
  slippageBps?: number;
  venue?: string;
  wallet?: string;
  pair?: string;
  mode?: string;
  raw: Record<string, unknown>;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

function toNumberValue(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function normalizeActionId(raw: Record<string, unknown>): string {
  const value = toStringValue(raw.action) || toStringValue(raw.bankrActionId);
  if (!value) return "bankr.token.actions";
  if (value === "bankr.wallet") return "bankr.wallet.read";
  if (value === "bankr.quote" || value === "bankr.token.read") return "bankr.token.info";
  if (value === "bankr.plan" || value === "bankr.token.actions.plan") {
    return "bankr.token.actions";
  }
  return value;
}

function normalizeShape(action: unknown): ActionShape {
  const raw = toRecord(action);
  const input = toRecord(raw.input);
  const merged: Record<string, unknown> = { ...raw, ...input };
  const actionId = normalizeActionId(merged);
  const chain = toStringValue(merged.chain)?.toLowerCase() || "base";
  const token =
    toStringValue(merged.token)?.toUpperCase() ||
    toStringValue(merged.symbol)?.toUpperCase() ||
    toStringValue(merged.from)?.toUpperCase() ||
    "USDC";
  const amount =
    toNumberValue(merged.amountUsd) ??
    toNumberValue(merged.amount) ??
    toNumberValue(merged.size) ??
    toNumberValue(merged.initialLiquidityUsd);
  const slippageBps =
    toNumberValue(merged.slippageBps) ??
    (toNumberValue(merged.slippage) !== undefined
      ? Number(toNumberValue(merged.slippage)! * 100)
      : undefined);
  const venue = toStringValue(merged.venue) || "bankr";
  const wallet = toStringValue(merged.wallet);
  const pair = toStringValue(merged.pair);
  const mode = toStringValue(merged.mode);

  return {
    actionId,
    route: toStringValue(merged.route),
    chain,
    token,
    amount,
    slippageBps,
    venue,
    wallet,
    pair,
    mode,
    raw: merged,
  };
}

function validate(shape: ActionShape): string[] {
  const warnings: string[] = [];

  if (!/^[a-z][a-z0-9-]{1,31}$/.test(shape.chain)) {
    warnings.push(`Chain format looks unusual: ${shape.chain}`);
  }

  if (!/^[A-Z0-9._-]{2,18}$/.test(shape.token)) {
    warnings.push(`Token format looks unusual: ${shape.token}`);
  }

  if (shape.amount !== undefined && shape.amount <= 0) {
    warnings.push("Amount must be greater than 0.");
  }

  if (shape.slippageBps !== undefined && shape.slippageBps > 500) {
    warnings.push("Slippage over 500 bps is high.");
  }

  if (shape.actionId === "bankr.launch") {
    if (!toStringValue(shape.raw.name)) warnings.push("Launch name is missing.");
    if (!toStringValue(shape.raw.symbol)) warnings.push("Launch symbol is missing.");
  }

  return warnings;
}

function stepsForAction(shape: ActionShape): string[] {
  if (shape.actionId === "bankr.wallet.read") {
    return [
      "Resolve target wallet and chain context.",
      "Build deterministic wallet snapshot request payload.",
      "Summarize balances and exposure by token.",
    ];
  }

  if (shape.actionId === "bankr.token.info") {
    return [
      "Resolve chain and token symbol.",
      "Build deterministic token info lookup payload.",
      "Summarize token metadata and market context.",
    ];
  }

  if (shape.actionId === "bankr.launch") {
    return [
      "Validate launch configuration fields.",
      "Construct launch proposal payload for review.",
      "Mark flow as write-sensitive and confirmation required.",
      "Require approval + lock + confirmedWrite before execution.",
    ];
  }

  return [
    "Validate action intent and normalized inputs.",
    "Build deterministic Bankr action request payload.",
    "Generate dry-run checklist for approval review.",
    "Confirm policy and execution gates before run.",
  ];
}

export function simulateBankrAction(action: any): SimulationResult {
  const shape = normalizeShape(action);
  const warnings = validate(shape);
  const steps = stepsForAction(shape);
  const route =
    shape.route ||
    (shape.actionId === "bankr.wallet.read"
      ? "/api/bankr/wallet"
      : shape.actionId === "bankr.token.info"
      ? "/api/bankr/token/info"
      : shape.actionId === "bankr.launch"
      ? "/api/bankr/launch"
      : "/api/bankr/token/actions");

  const inputs: Record<string, unknown> = {
    action: shape.actionId,
    route,
    chain: shape.chain,
    token: shape.token,
    venue: shape.venue,
  };
  if (shape.amount !== undefined) inputs.amount = shape.amount;
  if (shape.slippageBps !== undefined) inputs.slippageBps = shape.slippageBps;
  if (shape.wallet) inputs.wallet = shape.wallet;
  if (shape.pair) inputs.pair = shape.pair;
  if (shape.mode) inputs.mode = shape.mode;

  const ok = !warnings.some((warning) => warning.toLowerCase().includes("must be greater than"));
  const summary = ok
    ? `Dry-run ready for ${shape.actionId} on ${shape.chain}. No funds will move.`
    : `Dry-run found input issues for ${shape.actionId}. Fix warnings before execution.`;

  return {
    ok,
    summary,
    inputs,
    steps,
    warnings,
    timestamp: new Date().toISOString(),
  };
}

