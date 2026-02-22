import { NextResponse } from "next/server";

export type NormalizedError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiErrorResponse = {
  ok: false;
  error: NormalizedError;
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data } as any, init);
}

export function jsonErr(
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  const body: ApiErrorResponse = { ok: false, error: { code, message, details } };
  return NextResponse.json(body, { status });
}
