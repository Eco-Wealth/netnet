import { NextResponse } from "next/server";

function json(data: unknown, init?: ResponseInit) {
  return new NextResponse(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
}

export async function GET() {
  const bypass = process.env.X402_DEV_BYPASS === "true";

  if (bypass) {
    return json({
      ok: true,
      paid: true,
      ts: new Date().toISOString(),
      note: "X402_DEV_BYPASS=true",
    });
  }

  return json(
    {
      ok: false,
      paid: false,
      error: { code: "PAYMENT_REQUIRED", message: "x402 payment required" },
    },
    {
      status: 402,
      headers: {
        "x402-pay-to": process.env.X402_PAY_TO || "",
        "x402-network": process.env.X402_NETWORK || "",
      },
    }
  );
}
