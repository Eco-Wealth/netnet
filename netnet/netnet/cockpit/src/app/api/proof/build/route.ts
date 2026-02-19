import { NextRequest } from "next/server";
import { withObsJson } from "@/lib/obs";
import { feeRouting } from "@/lib/economics";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const estimatedUsd = typeof body?.estimatedUsd === "number" ? body.estimatedUsd : 0;
  const econ = feeRouting(estimatedUsd);

  // Keep this intentionally generic; upstream units can replace with deterministic proof builder.
  const proof = {
    schema: "netnet.proof.v1",
    createdAt: new Date().toISOString(),
    action: body?.action || "unknown",
    refs: body?.refs || {},
  };

  return withObsJson(req, "/api/proof/build", { ok: true, proof, economics: econ });
}
