import { NextResponse } from "next/server";
import { runSecurityAudit } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

function cid() {
  return globalThis.crypto?.randomUUID?.() ?? `cid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function GET() {
  const correlationId = cid();
  const audit = runSecurityAudit();

  // Minimal structured log; avoid secrets.
  console.log(JSON.stringify({
    at: "api.security.audit",
    correlationId,
    ok: audit.ok,
    summary: audit.summary,
  }));

  return NextResponse.json(
    { ok: true, audit, correlationId },
    { headers: { "x-correlation-id": correlationId } }
  );
}
