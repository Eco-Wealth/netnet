import { NextResponse } from "next/server";
import { withX402 } from "@x402/next";

export const runtime = "nodejs";

function boolEnv(v: string | undefined) {
  return (v ?? "").toLowerCase() === "true";
}

const handler = async () => {
  const payTo = process.env.X402_PAY_TO || null;
  return NextResponse.json({ ok: true, paid: true, payTo });
};

// In dev only, allow bypass if explicitly enabled.
// NOTE: this endpoint is intended to be paywalled in normal operation.
export const GET = (() => {
  const bypass = boolEnv(process.env.X402_DEV_BYPASS);
  if (bypass) {
    return async () => {
      const payTo = process.env.X402_PAY_TO || null;
      return NextResponse.json({ ok: true, paid: true, bypass: true, payTo });
    };
  }

  // Paywalled by default.
  return withX402(handler);
})();
