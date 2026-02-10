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
