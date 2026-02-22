import { NextRequest } from "next/server";
import { withObsJson } from "@/lib/obs";
import { feeRouting } from "@/lib/economics";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = (searchParams.get("action") || "info").toLowerCase();

  if (action === "info") {
    const econ = feeRouting(0);
    return withObsJson(req, "/api/agent/trade", {
      ok: true,
      trade: { enabled: false, maxUsd: 25, allowlistTokens: ["USDC", "ETH"], defaultMode: "DRY_RUN" },
      economics: econ,
      nextAction: "Use action=quote to simulate a quote; POST to get an executionPlan (DRY_RUN).",
    });
  }

  // keep other actions stubby but observable
  return withObsJson(req, "/api/agent/trade", {
    ok: false,
    error: { code: "UNSUPPORTED_ACTION", message: `Unsupported action: ${action}` },
  }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const amount =
    typeof body?.amountUsd === "number"
      ? body.amountUsd
      : typeof body?.amount === "number"
      ? body.amount
      : 0;
  const economics = feeRouting(amount);

  return withObsJson(req, "/api/agent/trade", {
    ok: true,
    mode: "DRY_RUN",
    requiresApproval: true,
    executionPlan: {
      action: "trade.plan",
      route: "/api/agent/trade",
      dryRun: true,
      intent: {
        from: typeof body?.from === "string" ? body.from : "USDC",
        to: typeof body?.to === "string" ? body.to : "ETH",
        chain: typeof body?.chain === "string" ? body.chain : "base",
        amountUsd: amount,
      },
    },
    economics,
    nextAction:
      "Review executionPlan and policy checks. If approved, submit to execution boundary.",
  });
}
