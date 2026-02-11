import { NextRequest, NextResponse } from "next/server";
import {
  appendWorkEvent,
  getWorkItem,
  updateWorkItem,
  type UpdateWorkInput,
} from "@/lib/work/store";
import type { WorkEventType } from "@/lib/work/types";

export const runtime = "nodejs";

function normalizeEventType(value: unknown): WorkEventType {
  const raw = String(value || "").toUpperCase();
  const map: Record<string, WorkEventType> = {
    NOTE: "NOTE",
    COMMENT: "NOTE",
    INFO: "NOTE",
    PROPOSAL: "PROPOSAL",
    APPROVAL: "APPROVAL",
    EXECUTION: "EXECUTION",
    ERROR: "ERROR",
    PATCH: "PATCH",
    UPDATED: "PATCH",
  };
  return map[raw] || "NOTE";
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const item = getWorkItem(ctx.params.id);
  if (!item) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "work item not found" } },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, item });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  let body: Partial<UpdateWorkInput> = {};
  try {
    body = await req.json();
  } catch {}

  const item = updateWorkItem(ctx.params.id, {
    ...body,
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
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const type = normalizeEventType(body.type);
  const by = String(body.by || "operator");
  const note = body.note ? String(body.note) : undefined;

  const item = appendWorkEvent(ctx.params.id, {
    type,
    by,
    note,
    patch: body.patch ?? null,
    meta: body.meta ?? null,
  });

  if (!item) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "work item not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, item });
}
