import { NextResponse } from "next/server";
import { createLaunchProposal, submitLaunchProposal, BankrLaunchRequest } from "@/lib/bankr/launcher";

const Body = BankrLaunchRequest;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "BAD_REQUEST", message: "Invalid body", details: parsed.error.flatten() },
      },
      { status: 400 }
    );
  }

  const proposal = createLaunchProposal(parsed.data);
  const stored = await submitLaunchProposal(proposal).catch((e) => ({
    ok: false,
    error: { message: String(e?.message ?? e) },
  }));

  return NextResponse.json({
    ok: true,
    proposal,
    stored,
    nextAction:
      "Present proposal.whatWillHappen + estimatedCosts to operator. If approved, execute launch via Bankr tooling and attach proof-of-action.",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    actions: ["POST"],
    contract: {
      method: "POST",
      body: {
        name: "string",
        symbol: "string",
        chain: "string",
        initialLiquidityUsd: "number (optional)",
        notes: "string (optional)",
        operator: { id: "string", reason: "string" },
      },
    },
    safety: {
      mode: "PROPOSE_ONLY",
      requiresApproval: true,
      note: "This endpoint does not launch tokens; it generates a proposal packet for operator execution.",
    },
  });
}
