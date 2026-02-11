import { NextRequest, NextResponse } from "next/server";
import { createWorkItem, listWorkItems } from "@/lib/work/store";

/**
 * Work API (canonical)
 * - GET  /api/work             -> list
 * - POST /api/work             -> create, returns { ok, id, item }
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // Optional filters (best-effort; if store doesn't support fields, filtering is harmless)
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();
  const status = (url.searchParams.get("status") || "").toUpperCase().trim();
  const owner = (url.searchParams.get("owner") || "").toLowerCase().trim();

  let items = listWorkItems();

  if (q) {
    items = items.filter((it: any) =>
      String((it.title || "") + " " + (it.description || "")).toLowerCase().includes(q)
    );
  }
  if (status) {
    items = items.filter((it: any) => String(it.status || "").toUpperCase() === status);
  }
  if (owner) {
    items = items.filter((it: any) => String(it.owner || "").toLowerCase().includes(owner));
  }

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ ok: false, error: "Missing title" }, { status: 400 });
  }

  const item = createWorkItem({
    title,
    description: typeof body.description === "string" ? body.description : undefined,
    kind: typeof body.kind === "string" ? body.kind : undefined,
    acceptance: typeof body.acceptance === "string" ? body.acceptance : undefined,
    slaHours: typeof body.slaHours === "number" ? body.slaHours : undefined,
    owner: typeof body.owner === "string" ? body.owner : undefined,
    priority: typeof body.priority === "string" ? body.priority : undefined,
    status: typeof body.status === "string" ? body.status : undefined,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    data: body.meta ?? undefined,
  });

  return NextResponse.json({ ok: true, id: item.id, item }, { status: 201 });
}
