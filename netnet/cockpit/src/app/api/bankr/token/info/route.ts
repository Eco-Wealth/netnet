import { NextResponse } from "next/server";
import { getBankrTokenInfo } from "@/lib/bankr/token";

export async function GET() {
  const info = await getBankrTokenInfo();
  return NextResponse.json({ ok: true, ...info });
}
