import { NextResponse } from "next/server";
import { capitalsCatalog, principlesCatalog } from "@/lib/econ/regenerative";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    schema: "netnet.econ.catalog.v1",
    capitals: capitalsCatalog(),
    principles: principlesCatalog(),
  });
}
