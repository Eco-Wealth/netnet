import { NextResponse } from "next/server";

export async function GET() {
  // This route is protected by x402 middleware (middleware.ts).
  return NextResponse.json({
    ok: true,
    paid: true,
    ts: new Date().toISOString(),
    note: "If you can see this, the x402 paywall was satisfied by the caller.",
  });
}
