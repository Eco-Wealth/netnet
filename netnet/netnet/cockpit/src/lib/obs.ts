import { NextRequest, NextResponse } from "next/server";

export type ObsContext = {
  traceId: string;
  route: string;
  startedAt: number;
};

function genTraceId(): string {
  // short, URL-safe-ish
  const rnd = Math.random().toString(16).slice(2);
  return `nn_${Date.now().toString(16)}_${rnd.slice(0, 8)}`;
}

export function getTraceId(req?: NextRequest): string {
  const h = req?.headers?.get("x-netnet-trace") || req?.headers?.get("x-request-id") || "";
  return h.trim() || genTraceId();
}

export function obsContext(req: NextRequest, route: string): ObsContext {
  return { traceId: getTraceId(req), route, startedAt: Date.now() };
}

export function withObsJson<T extends Record<string, any>>(
  req: NextRequest,
  route: string,
  payload: T,
  init?: { status?: number; headers?: Record<string, string> }
) {
  const ctx = obsContext(req, route);
  const body = {
    ...payload,
    _obs: {
      traceId: ctx.traceId,
      route: ctx.route,
      ms: Date.now() - ctx.startedAt,
    },
  };

  const headers = {
    "x-netnet-trace": ctx.traceId,
    ...(init?.headers || {}),
  };

  return NextResponse.json(body, { status: init?.status ?? 200, headers });
}
