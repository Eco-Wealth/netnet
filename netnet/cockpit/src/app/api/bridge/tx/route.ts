import { NextRequest, NextResponse } from "next/server";
import { fetchTx } from "@/lib/bridge";

function isLikelyTxHash(s: string) {
  const clean = s.startsWith("0x") ? s.slice(2) : s;
  return /^[0-9a-fA-F]{64}$/.test(clean);
}

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get("hash")?.trim() ?? "";
  if (!hash) return NextResponse.json({ error: "Missing ?hash=" }, { status: 400 });
  if (!isLikelyTxHash(hash)) return NextResponse.json({ error: "Invalid tx hash format" }, { status: 400 });

  try {
    const data = await fetchTx(hash);
    if ((data as any)?.error === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Transaction not found (yet). Wait 30-60s and retry." },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 502 });
  }
}
