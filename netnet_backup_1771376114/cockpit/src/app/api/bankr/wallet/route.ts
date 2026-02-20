import { NextResponse } from "next/server";
import { fetchBankrWallet } from "@/lib/bankrWallet";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = (url.searchParams.get("action") || "state").toLowerCase();
  const wallet = url.searchParams.get("wallet") || undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : undefined;

  if (!["balances", "positions", "history", "state"].includes(action)) {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_ACTION", message: "Use action=balances|positions|history|state" } },
      { status: 400 }
    );
  }

  const result = await fetchBankrWallet({ action: action as any, wallet, limit });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
