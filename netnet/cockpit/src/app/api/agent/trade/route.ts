import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforcePolicy, tradePolicyEnvelope } from "@/lib/policy/enforce";

/**
 * Unit N — Trade API v2 (PROPOSE-ONLY)
 * - GET ?action=info|quote|plan (plan on GET returns guidance; use POST to execute plan contract)
 * - POST { action: "plan", ... }
 * No broadcasting. Always returns `requiresApproval: true`.
 */

const QuoteQuery = z.object({
  action: z.enum(["info", "quote", "plan"]).default("info"),
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
        policy: tradePolicyEnvelope(),
      },
    });
  }

  if (q.action === "plan") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Use POST /api/agent/trade with body.action='plan'",
        },
        expectedBody: {
          action: "plan",
          chain: "base",
          venue: "bankr",
          from: "USDC",
          to: "REGEN",
          amountUsd: 50,
          operator: { id: "operator-1", reason: "rebalance" },
        },
      },
      { status: 405 }
    );
  }

  // Quote (mock, propose-only)
  if (!q.from || !q.to || !q.amountUsd) {
    return NextResponse.json(
      { ok: false, error: "Missing from,to,amountUsd for quote" },
      { status: 400 }
    );
  }

  const gate = enforcePolicy("trade.quote", {
    route: "/api/agent/trade",
    chain: q.chain,
    venue: q.venue,
    fromToken: q.from,
    toToken: q.to,
    amountUsd: q.amountUsd,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Policy blocked", details: gate.reasons, policy: gate.policy },
      { status: 403 }
    );
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

  const gate = enforcePolicy("trade.plan", {
    route: "/api/agent/trade",
    chain: b.chain,
    venue: b.venue,
    fromToken: b.from,
    toToken: b.to,
    amountUsd: b.amountUsd,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Policy blocked", details: gate.reasons, policy: gate.policy },
      { status: 403 }
    );
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
