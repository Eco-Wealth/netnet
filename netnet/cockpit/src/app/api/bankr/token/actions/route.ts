import { NextResponse } from "next/server";
import { tokenActionCatalog } from "@/lib/bankr/token";
import { enforcePolicy } from "@/lib/policy/enforce";
import type { PolicyAction } from "@/lib/policy/types";

export async function GET() {
  const gate = enforcePolicy("token.manage", {
    route: "/api/bankr/token/actions",
    venue: "bankr",
  });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Policy blocked", details: gate.reasons },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    execution: { mode: "PROPOSE_ONLY", requiresApproval: true },
    requiredOutputs: ["whatWillHappen", "estimatedCosts", "requiresApproval"],
    actions: tokenActionCatalog(),
    nextAction: "POST with { action, params } to receive a proposed plan + proof-of-action envelope."
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const params = (body?.params || {}) as Record<string, unknown>;

  const catalog = tokenActionCatalog();
  const def = catalog.find(a => a.action === action);

  if (!def) {
    return NextResponse.json(
      { ok: false, error: { code: "UNKNOWN_ACTION", message: "Unknown token action", known: catalog.map(a => a.action) } },
      { status: 400 }
    );
  }

  const policyAction: PolicyAction =
    action === "launch"
      ? "token.launch"
      : action === "fee_route"
      ? "token.manage"
      : "proof.build";
  const gate = enforcePolicy(policyAction, {
    route: "/api/bankr/token/actions",
    chain: typeof params.chain === "string" ? params.chain : undefined,
    venue: "bankr",
    toToken: typeof params.symbol === "string" ? params.symbol : undefined,
    amountUsd: typeof params.amountUsd === "number" ? params.amountUsd : undefined,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Policy blocked", details: gate.reasons },
      { status: 403 }
    );
  }

  // Proposal-only: we do not execute. We produce a deterministic "proof-of-action" envelope for auditability.
  const now = new Date().toISOString();
  const plan = {
    action,
    params,
    whatWillHappen: def.whatWillHappen(params),
    estimatedCosts: def.estimatedCosts(params),
    requiresApproval: true,
    safety: def.safety,
    createdAt: now
  };

  const { buildActionProof } = await import("@/lib/proof/action");
  const proof = buildActionProof({ kind: "bankr.token", plan });

  return NextResponse.json({ ok: true, plan, proof, nextAction: "Operator reviews plan, then executes via Bankr (external) or future EXECUTE_WITH_LIMITS mode." });
}
