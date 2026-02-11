import { NextResponse } from "next/server";

export const runtime = "nodejs";

function boolEnv(v: string | undefined) {
  return (v ?? "").toLowerCase() === "true";
}

function paymentRequired(payTo: string) {
  return NextResponse.json(
    {
      ok: false,
      paid: false,
      error: {
        code: "PAYMENT_REQUIRED",
        message: "Payment required for /api/proof-paid.",
      },
    },
    {
      status: 402,
      headers: {
        "x402-pay-to": payTo,
        "x402-version": "netnet-x402-v1",
        "www-authenticate": `x402 realm=\"netnet-proof\", pay_to=\"${payTo}\"`,
      },
    }
  );
}

export async function GET() {
  const bypass = boolEnv(process.env.X402_DEV_BYPASS);
  const payTo = (process.env.X402_PAY_TO ?? "").trim();

  if (bypass) {
    return NextResponse.json({ ok: true, paid: true, bypass: true, payTo: payTo || "(bypass)" });
  }

  if (!payTo) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "X402_NOT_CONFIGURED", message: "Set X402_PAY_TO or enable X402_DEV_BYPASS for local development." },
      },
      { status: 503 }
    );
  }

  return paymentRequired(payTo);
}
