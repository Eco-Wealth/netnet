import { NextRequest, NextResponse } from "next/server";
import { createWork, listWork, WorkCreateInput } from "@/lib/work";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "list";

  if (action !== "list") {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_ACTION", message: "Unsupported action" } },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, items: listWork() });
}

export async function POST(req: NextRequest) {
  let body: Partial<WorkCreateInput> = {};
  try {
    body = await req.json();
  } catch {}

  const title = (body.title || "").trim();
  if (!title) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "title is required" } },
      { status: 400 }
    );
  }

  const item = createWork({
    title,
    description: body.description,
    owner: body.owner,
    tags: body.tags,
    priority: body.priority,
    slaHours: body.slaHours,
    dueAt: body.dueAt,
    acceptanceCriteria: body.acceptanceCriteria,
    escalationPolicy: body.escalationPolicy,
    actor: body.actor || "operator",
  });

  return NextResponse.json({ ok: true, item }, { status: 201 });
}
