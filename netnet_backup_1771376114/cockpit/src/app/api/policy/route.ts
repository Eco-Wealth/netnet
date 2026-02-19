import { NextRequest, NextResponse } from "next/server";
import { getPolicy, setPolicy, type Policy } from "@/lib/policy/store";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "operator auth required" } },
    { status: 401 }
  );
}

function canWrite(req: NextRequest) {
  // Dev default: allow local iteration without wiring secrets.
  if (process.env.NODE_ENV === "development") return true;
  const token = process.env.OPERATOR_TOKEN;
  if (!token) return false;
  const hdr = req.headers.get("x-operator-token");
  return hdr === token;
}

export async function GET() {
  const policy = getPolicy();
  return NextResponse.json({ ok: true, policy });
}

export async function POST(req: NextRequest) {
  if (!canWrite(req)) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_JSON", message: "invalid json body" } },
      { status: 400 }
    );
  }

  const next = (body as any)?.policy as Policy | undefined;
  if (!next || typeof next !== "object") {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_REQUEST", message: "missing policy object" } },
      { status: 400 }
    );
  }

  const updated = setPolicy(next);
  return NextResponse.json({ ok: true, policy: updated });
}
