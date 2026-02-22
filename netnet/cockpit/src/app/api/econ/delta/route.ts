import { NextResponse } from "next/server";
import { generateActionDelta } from "@/lib/econ/regenerative";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const type = typeof body?.type === "string" ? body.type : "unknown";
  const summary = typeof body?.summary === "string" ? body.summary : "No summary provided.";
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t: any) => typeof t === "string") : undefined;

  const delta = generateActionDelta({
    id: typeof body?.id === "string" ? body.id : undefined,
    type,
    summary,
    tags,
    deltas: Array.isArray(body?.deltas) ? body.deltas : undefined,
    principlesApplied: Array.isArray(body?.principlesApplied) ? body.principlesApplied : undefined,
  });

  return NextResponse.json(delta);
}
