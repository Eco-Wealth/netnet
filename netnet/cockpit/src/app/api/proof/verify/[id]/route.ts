import { NextResponse } from "next/server";
import { verifyProofArtifact } from "@/lib/proof/registry";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_req: Request, context: RouteContext) {
  const id = String(context.params.id || "").trim();
  const links = {
    proofPage: id ? `/proof/${id}` : "/proof",
    verifyApi: id ? `/api/proof/verify/${id}` : "/api/proof/verify",
    workQuery: id ? `/work?hasProof=1&proofId=${encodeURIComponent(id)}` : "/work?hasProof=1",
    distributeAnchor: id ? `/distribute#${id}` : "/distribute",
  };
  if (!id) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_ID",
          message: "Proof id is required.",
        },
        links,
      },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const verification = verifyProofArtifact(id);
  if (!verification) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Proof not found.",
        },
        id,
        links,
      },
      { status: 404, headers: { "cache-control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      id,
      verification,
      links,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
