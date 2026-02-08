import { NextResponse } from "next/server";

export const runtime = "nodejs";

function boolEnv(v: string | undefined) {
  return (v ?? "").toLowerCase() === "true";
}

export async function GET() {
  const bypassEnabled = boolEnv(process.env.X402_DEV_BYPASS);
  const payTo = process.env.X402_PAY_TO || null;
  return NextResponse.json({ ok: true, bypassEnabled, payTo });
}
