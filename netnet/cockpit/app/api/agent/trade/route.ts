import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ErrorShape = (code: string, message: string, details?: unknown, status = 400) =>
  NextResponse.json({ ok: false, error: { code, message, details } }, { status });

const truthy = (v: string | undefined) => (v ?? "").toLowerCase() === "true";

const TradeConfig = () => {
  const enabled = truthy(process.env.TRADE_ENABLED);
  const maxUsd = Number(process.env.TRADE_MAX_USD ?? "25");
  const allow = (process.env.TRADE_ALLOWLIST_TOKENS ?? "USDC,ETH")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return { enabled, maxUsd: Number.isFinite(maxUsd) ? maxUsd : 25, allow };
};

const ActionSchema = z.enum(["info", "quote"]);
const QuoteQuerySchema = z.object({
  action: z.literal("quote"),
  side: z.enum(["buy", "sell"]).default("buy"),
  tokenIn: z.string().min(2),
  tokenOut: z.string().min(2),
  amountUsd: z.coerce.number().positive(),
});

const PostSchema = z.object({
  // Required, even in DRY_RUN, so agents must provide intent/context
  reason: z.string().min(3).max(280),
  beneficiaryName: z.string().min(2).max(80),

  side: z.enum(["buy", "sell"]).default("buy"),
  tokenIn: z.string().min(2).default("USDC"),
  tokenOut: z.string().min(2).default("ETH"),
  amountUsd: z.number().positive(),

  // Safety: dryRun defaults true and MUST remain true unless TRADE_ENABLED=true
  dryRun: z.boolean().optional().default(true),
  slippageBps: z.number().int().min(0).max(500).optional().default(50),
});

function normalizeToken(t: string) {
  return t.trim().toUpperCase();
}

function simulatedPrice(tokenOut: string) {
  // Deterministic-ish placeholder prices for scaffold only.
  // No guarantees; just enough to test the interface.
  const t = normalizeToken(tokenOut);
  if (t === "ETH") return 2500;
  if (t === "WETH") return 2500;
  if (t === "BTC" || t === "CBBTC") return 45000;
  return 1; // stable or unknown
}

function buildExecutionPlan(input: {
  side: "buy" | "sell";
  tokenIn: string;
  tokenOut: string;
  amountUsd: number;
  slippageBps: number;
}) {
  const tokenIn = normalizeToken(input.tokenIn);
  const tokenOut = normalizeToken(input.tokenOut);
  const px = simulatedPrice(tokenOut);

  const expectedOut = input.side === "buy" ? input.amountUsd / px : input.amountUsd; // very rough scaffold
  const minOut = expectedOut * (1 - input.slippageBps / 10000);

  return {
    mode: "DRY_RUN",
    venue: "GMX (stub)",
    side: input.side,
    tokenIn,
    tokenOut,
    amountUsd: input.amountUsd,
    slippageBps: input.slippageBps,
    quote: {
      priceAssumptionUsd: px,
      expectedOut,
      minOut,
    },
    warnings: [
      "Trading is disabled by default; this endpoint only returns a plan unless TRADE_ENABLED=true.",
      "No transaction is broadcast by this module (scaffold only).",
      "Prices are placeholders for interface testing only.",
    ],
  };
}

function buildProofObject(plan: any, context: { beneficiaryName: string; reason: string }) {
  const now = new Date().toISOString();
  // Keep schema compatible with Unit 6 proof objects, but don't hard-couple imports.
  return {
    schema: "netnet.proof.v1",
    kind: "trade_attempt",
    timestamp: now,
    subject: { operator: context.beneficiaryName },
    refs: {},
    claims: {
      reason: context.reason,
      plan,
    },
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "info";
  const cfg = TradeConfig();

  const parsedAction = ActionSchema.safeParse(action);
  if (!parsedAction.success) {
    return ErrorShape("bad_request", "Invalid action", parsedAction.error.flatten());
  }

  if (parsedAction.data === "info") {
    return NextResponse.json({
      ok: true,
      trade: {
        enabled: cfg.enabled,
        maxUsd: cfg.maxUsd,
        allowlistTokens: cfg.allow,
        defaultMode: "DRY_RUN",
      },
      nextAction: "Use action=quote to simulate a quote; POST to get an executionPlan (DRY_RUN).",
    });
  }

  const q = QuoteQuerySchema.safeParse({
    action,
    side: url.searchParams.get("side") ?? undefined,
    tokenIn: url.searchParams.get("tokenIn") ?? "",
    tokenOut: url.searchParams.get("tokenOut") ?? "",
    amountUsd: url.searchParams.get("amountUsd") ?? "",
  });

  if (!q.success) {
    return ErrorShape("bad_request", "Invalid quote parameters", q.error.flatten());
  }

  const tokenIn = normalizeToken(q.data.tokenIn);
  const tokenOut = normalizeToken(q.data.tokenOut);
  if (!cfg.allow.includes(tokenIn) || !cfg.allow.includes(tokenOut)) {
    return ErrorShape(
      "token_not_allowed",
      `Token not allowed. Allowlist is: ${cfg.allow.join(", ")}`,
      { tokenIn, tokenOut }
    );
  }
  if (q.data.amountUsd > cfg.maxUsd) {
    return ErrorShape("amount_exceeds_cap", `amountUsd exceeds cap (${cfg.maxUsd})`, { amountUsd: q.data.amountUsd }, 400);
  }

  const plan = buildExecutionPlan({
    side: q.data.side,
    tokenIn,
    tokenOut,
    amountUsd: q.data.amountUsd,
    slippageBps: 50,
  });

  return NextResponse.json({
    ok: true,
    quote: plan.quote,
    executionPlan: plan,
    nextAction: "POST /api/agent/trade to request an executionPlan (DRY_RUN by default).",
  });
}

export async function POST(req: NextRequest) {
  const cfg = TradeConfig();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ErrorShape("bad_request", "Body must be valid JSON", undefined, 400);
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return ErrorShape("bad_request", "Invalid trade request", parsed.error.flatten(), 400);
  }

  const tokenIn = normalizeToken(parsed.data.tokenIn);
  const tokenOut = normalizeToken(parsed.data.tokenOut);

  if (!cfg.allow.includes(tokenIn) || !cfg.allow.includes(tokenOut)) {
    return ErrorShape(
      "token_not_allowed",
      `Token not allowed. Allowlist is: ${cfg.allow.join(", ")}`,
      { tokenIn, tokenOut }
    );
  }

  if (parsed.data.amountUsd > cfg.maxUsd) {
    return ErrorShape("amount_exceeds_cap", `amountUsd exceeds cap (${cfg.maxUsd})`, { amountUsd: parsed.data.amountUsd }, 400);
  }

  const requestedDryRun = parsed.data.dryRun ?? true;
  const effectiveDryRun = cfg.enabled ? requestedDryRun : true; // force DRY_RUN unless enabled

  const plan = buildExecutionPlan({
    side: parsed.data.side,
    tokenIn,
    tokenOut,
    amountUsd: parsed.data.amountUsd,
    slippageBps: parsed.data.slippageBps,
  });

  // Hard safety: even when enabled, this module still does not broadcast.
  plan.mode = effectiveDryRun ? "DRY_RUN" : "PLAN_ONLY";

  const proof = buildProofObject(plan, {
    beneficiaryName: parsed.data.beneficiaryName,
    reason: parsed.data.reason,
  });

  return NextResponse.json({
    ok: true,
    dryRun: effectiveDryRun,
    executionPlan: plan,
    proof,
    nextAction: effectiveDryRun
      ? "No funds moved. Operator may review the plan and decide next steps."
      : "Execution is not implemented. This is a scaffold. Do not assume funds moved.",
  });
}
