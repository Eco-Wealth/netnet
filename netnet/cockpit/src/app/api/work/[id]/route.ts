import { NextRequest, NextResponse } from "next/server";
import { appendWorkEvent, getWork, updateWork, WorkUpdateInput } from "@/lib/work";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const item = getWork(ctx.params.id);
  if (!item) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "work item not found" } },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, item });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  let body: Partial<WorkUpdateInput> = {};
  try {
    body = await req.json();
  } catch {}

  const item = updateWork(ctx.params.id, {
    ...body,
    actor: body.actor || "operator",
    note: body.note,
  });

  if (!item) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "work item not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, item });
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  // event append (comment/escalation/approval signals)
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const type = String(body.type || "").toUpperCase();
  const by = String(body.by || "operator");
  const note = body.note ? String(body.note) : undefined;

  if (!type) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "type is required" } },
      { status: 400 }
    );
  }

  const item = appendWorkEvent(ctx.params.id, {
    type,
    by,
    note,
    patch: body.patch,
  });

  if (!item) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "work item not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, item });
}
