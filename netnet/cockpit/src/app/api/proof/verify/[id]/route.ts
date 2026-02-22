import { NextResponse } from "next/server";
import { verifyProofArtifact } from "@/lib/proof/registry";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_req: Request, context: RouteContext) {
  const id = String(context.params.id || "").trim();
  if (!id) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_ID",
          message: "Proof id is required.",
        },
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
      },
      { status: 404, headers: { "cache-control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      id,
      verification,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
