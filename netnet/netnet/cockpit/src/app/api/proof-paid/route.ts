import { NextResponse } from "next/server";

export const runtime = "nodejs";

function boolEnv(v: string | undefined) {
  return (v ?? "").toLowerCase() === "true";
}

const X402_VERSION = "netnet-x402-v1";
const DEV_PAID_TOKEN_HEADER = "x-netnet-paid-token";

function clean(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : "";
}

function challengeHeaders(payTo: string) {
  return {
    "x402-version": X402_VERSION,
    "x402-pay-to": payTo,
    "www-authenticate": `x402 realm="netnet-proof", pay_to="${payTo}"`,
  };
}

function gatewayPaid(req: Request) {
  const paidSignals = [
    clean(req.headers.get("x402-payment-status")).toLowerCase(),
    clean(req.headers.get("x-payment-status")).toLowerCase(),
    clean(req.headers.get("x402-verified")).toLowerCase(),
  ];
  return paidSignals.some((v) => v === "paid" || v === "verified" || v === "true" || v === "ok");
}

function devTokenAuthorized(req: Request) {
  const configured = clean(process.env.X402_DEV_PAID_TOKEN);
  if (!configured) return false;
  const sent = clean(req.headers.get(DEV_PAID_TOKEN_HEADER));
  return sent.length > 0 && sent === configured;
}

function paidResponse(payTo: string, mode: "gateway" | "dev_token" | "dev_bypass") {
  return NextResponse.json({
    ok: true,
    paid: true,
    payTo,
    mode,
    bypass: mode === "dev_bypass",
  });
}

function configError() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "X402_NOT_CONFIGURED",
        message: "X402_PAY_TO is required when X402_DEV_BYPASS is not enabled.",
        details: {
          required: ["X402_PAY_TO"],
          hint: "Set X402_PAY_TO in .env.local or enable X402_DEV_BYPASS=true for local development only.",
        },
      },
    },
    { status: 503 }
  );
}

function paymentRequired(payTo: string) {
  return NextResponse.json(
    {
      ok: false,
      paid: false,
      error: {
        code: "PAYMENT_REQUIRED",
        message: "Payment required for /api/proof-paid.",
        details: {
          source: "x402",
          retryable: true,
          requires: "payment_or_authorization",
        },
      },
    },
    { status: 402, headers: challengeHeaders(payTo) }
  );
}

export async function GET(req: Request) {
  const bypass = boolEnv(process.env.X402_DEV_BYPASS);
  const payTo = clean(process.env.X402_PAY_TO);

  if (bypass) {
    return paidResponse(payTo || "(bypass)", "dev_bypass");
  }

  if (!payTo) {
    return configError();
  }

  if (gatewayPaid(req)) {
    return paidResponse(payTo, "gateway");
  }

  if (devTokenAuthorized(req)) {
    return paidResponse(payTo, "dev_token");
  }

  return paymentRequired(payTo);
}
