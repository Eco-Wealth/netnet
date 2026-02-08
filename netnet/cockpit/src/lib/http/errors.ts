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
