import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Unit N — Trade API v2 (PROPOSE-ONLY)
 * - GET ?action=info|quote
 * - POST { action: "plan", ... }
 * No broadcasting. Always returns `requiresApproval: true`.
 */

const QuoteQuery = z.object({
  action: z.enum(["info", "quote"]).default("info"),
  chain: z.string().min(1).default("base"),
  venue: z.string().min(1).default("bankr"),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  amountUsd: z.coerce.number().positive().max(1_000_000).optional(),
});

const PlanBody = z.object({
  action: z.literal("plan"),
  chain: z.string().min(1).default("base"),
  venue: z.string().min(1).default("bankr"),
  from: z.string().min(1),
  to: z.string().min(1),
  amountUsd: z.number().positive().max(1_000_000),
  operator: z.object({
    id: z.string().min(1),
    reason: z.string().min(3),
  }),
});

function nowIso() {
  return new Date().toISOString();
}

function defaultPolicy() {
  return {
    autonomyLevel: "PROPOSE_ONLY" as const,
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
}

function policyCheck(input: { chain: string; venue: string; from: string; to: string; amountUsd: number }) {
  const p = defaultPolicy();
  const errors: string[] = [];
  if (!p.allowlists.chains.includes(input.chain)) errors.push(`chain not allowed: ${input.chain}`);
  if (!p.allowlists.venues.includes(input.venue)) errors.push(`venue not allowed: ${input.venue}`);
  if (!p.allowlists.tokens.includes(input.from)) errors.push(`from token not allowed: ${input.from}`);
  if (!p.allowlists.tokens.includes(input.to)) errors.push(`to token not allowed: ${input.to}`);
  if (input.amountUsd > p.caps.maxUsdPerTrade) errors.push(`amountUsd exceeds maxUsdPerTrade (${p.caps.maxUsdPerTrade})`);
  return { ok: errors.length === 0, errors, policy: p };
}

function proofEnvelope(args: {
  kind: string;
  subject: any;
  claims: any;
  requiresApproval: boolean;
  estimatedCostsUsd: number;
}) {
  return {
    kind: args.kind,
    createdAt: nowIso(),
    subject: args.subject,
    claims: args.claims,
    economics: {
      estimatedCostsUsd: args.estimatedCostsUsd,
      requiresApproval: args.requiresApproval,
      note: "PROPOSE_ONLY — no signing/broadcast in this endpoint.",
    },
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = QuoteQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const q = parsed.data;

  if (q.action === "info") {
    return NextResponse.json({
      ok: true,
      mode: "PROPOSE_ONLY",
      trade: {
        actions: ["quote", "plan"],
        defaultChain: q.chain,
        defaultVenue: q.venue,
        policy: defaultPolicy(),
      },
    });
  }

  // Quote (mock, propose-only)
  if (!q.from || !q.to || !q.amountUsd) {
    return NextResponse.json(
      { ok: false, error: "Missing from,to,amountUsd for quote" },
      { status: 400 }
    );
  }

  const gate = policyCheck({ chain: q.chain, venue: q.venue, from: q.from, to: q.to, amountUsd: q.amountUsd });
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: "Policy blocked", details: gate.errors, policy: gate.policy }, { status: 403 });
  }

  const feeBps = 120; // informational only
  const estimatedFeeUsd = (q.amountUsd * feeBps) / 10_000;

  return NextResponse.json({
    ok: true,
    quote: {
      chain: q.chain,
      venue: q.venue,
      from: q.from,
      to: q.to,
      amountUsd: q.amountUsd,
      feeBps,
      estimatedFeeUsd,
      slippageBpsSuggested: 50,
      note: "Quote is an estimate; final execution handled by Bankr/OpenClaw with operator approval.",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = PlanBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;

  const gate = policyCheck({ chain: b.chain, venue: b.venue, from: b.from, to: b.to, amountUsd: b.amountUsd });
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: "Policy blocked", details: gate.errors, policy: gate.policy }, { status: 403 });
  }

  const estimatedCostsUsd = 0.01; // placeholder inference cost; real value comes from ops/inference accounting later

  const plan = {
    whatWillHappen: [
      `Prepare a PROPOSED trade on ${b.chain} via ${b.venue}: ${b.amountUsd.toFixed(2)} USD of ${b.from} -> ${b.to}.`,
      "Return a proof-of-action object capturing inputs, policy gates, and required approval.",
      "No transaction will be signed or broadcast by this endpoint.",
    ],
    requiresApproval: true,
    estimatedCosts: {
      inferenceUsd: estimatedCostsUsd,
      onchainGasUsd: "unknown",
      venueFeesUsd: "estimated at quote time",
    },
    operatorIntent: b.operator,
  };

  const proof = proofEnvelope({
    kind: "netnet.trade.plan.v2",
    subject: { chain: b.chain, venue: b.venue, from: b.from, to: b.to, amountUsd: b.amountUsd },
    claims: { plan, policy: gate.policy, gate: { ok: true } },
    requiresApproval: true,
    estimatedCostsUsd,
  });

  return NextResponse.json({ ok: true, mode: "PROPOSE_ONLY", plan, proof });
}
