import { NextRequest, NextResponse } from "next/server";
import { getEcoTokenScanInfo } from "@/lib/ecotoken";

function isLikelyTxHash(s: string) {
  const clean = s.startsWith("0x") ? s.slice(2) : s;
  return /^[0-9a-fA-F]{64}$/.test(clean);
}

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get("hash")?.trim() ?? "";
  if (!hash) return NextResponse.json({ error: "Missing ?hash=" }, { status: 400 });

  // We accept non-EVM hashes too (ecoToken spans multiple chains), but we validate EVM style for now.
  if (hash.startsWith("0x") && !isLikelyTxHash(hash)) {
    return NextResponse.json({ error: "Invalid tx hash format" }, { status: 400 });
  }

  return NextResponse.json(getEcoTokenScanInfo(hash));
}
