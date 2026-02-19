import { NextRequest, NextResponse } from "next/server";
import { getRevenueInfo, getRevenueReport } from "@/lib/revenue";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = (searchParams.get("action") || "info").toLowerCase();

  try {
    if (action === "info") {
      return json(await getRevenueInfo());
    }
    if (action === "report") {
      const days = Number(searchParams.get("days") || "7");
      return json(await getRevenueReport({ days: Number.isFinite(days) ? days : 7 }));
    }
    return json({ ok: false, error: { code: "BAD_ACTION", message: "Unknown action" }, actions: ["info", "report"] }, 400);
  } catch (e: any) {
    return json({ ok: false, error: { code: "REVENUE_ERROR", message: e?.message || "Unknown error" } }, 500);
  }
}
