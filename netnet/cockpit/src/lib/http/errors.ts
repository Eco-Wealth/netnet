import { NextResponse } from "next/server";

export type NormalizedError = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, ...((data as any) ?? {}) }, { status });
}

export function jsonErr(code: string, message: string, status = 400, details?: unknown) {
  const payload: NormalizedError = { ok: false, error: { code, message, details } };
  return NextResponse.json(payload, { status });
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function withRequestId(
  handler: (req: Request) => Promise<Response>
) {
  return async function wrapped(req: Request) {
    const rid = requestId();
    const res = await handler(req);
    const headers = new Headers(res.headers);
    headers.set("x-request-id", rid);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}
