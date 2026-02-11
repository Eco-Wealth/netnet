import { NextResponse } from "next/server";
import { getBankrTokenInfo } from "@/lib/bankr/token";
import { enforcePolicy } from "@/lib/policy/enforce";

export async function GET() {
  const gate = enforcePolicy("proof.build", {
    route: "/api/bankr/token/info",
    venue: "bankr",
  });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Policy blocked", details: gate.reasons },
      { status: 403 }
    );
  }

  const info = await getBankrTokenInfo();
  return NextResponse.json({ ok: true, ...info });
}
