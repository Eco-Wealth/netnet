import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/http/errors";
import { rateLimitByIp } from "@/lib/http/ratelimit";
import { getBaseUrl } from "@/lib/server/baseUrl";

export const runtime = "nodejs";

const ChainSchema = z.enum(["base", "polygon", "celo", "ethereum"]).default("base");
const TokenSchema = z.string().min(2).max(16).default("USDC");

const EstimateSchema = z.object({
  computeHours: z.coerce.number().min(0).max(10_000).default(0),
  modelSize: z.string().min(1).max(64).default("unknown"),
});

const QuoteSchema = z.object({
  projectId: z.string().min(1).max(128),
  amount: z.coerce.number().positive().max(1_000_000),
  chain: ChainSchema,
  token: TokenSchema,
});

const PostSchema = z.object({
  projectId: z.string().min(1).max(128),
  amount: z.coerce.number().positive().max(1_000_000),
  chain: ChainSchema,
  token: TokenSchema,
  beneficiaryName: z.string().min(2).max(120),
  reason: z.string().min(5).max(500),
  maxTotalUsd: z.coerce.number().positive().max(100_000).optional(),
});

function ipFromReq(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function proxyJson(req: NextRequest, path: string, init?: RequestInit) {
  const base = getBaseUrl(req);
  if (!base) return null;

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

// GET /api/agent/carbon?action=...
export async function GET(req: NextRequest) {
  const ip = ipFromReq(req);
  const rl = rateLimitByIp(ip, { windowMs: 60_000, max: 120 });
  if (!rl.ok) return jsonErr("RATE_LIMITED", "Too many requests", 429, { resetAt: rl.resetAt });

  const url = new URL(req.url);
  const action = (url.searchParams.get("action") ?? "info").toLowerCase();

  try {
    if (action === "info") {
      return jsonOk({
        actions: ["info", "estimate", "projects", "quote", "status"],
        nextAction: "projects",
        safety: {
          postRequires: ["beneficiaryName", "reason"],
          note: "POST initiates a retirement request; payment must be explicitly confirmed by an operator.",
        },
      });
    }

    if (action === "estimate") {
      const parsed = EstimateSchema.safeParse({
        computeHours: url.searchParams.get("computeHours"),
        modelSize: url.searchParams.get("modelSize"),
      });
      if (!parsed.success) return jsonErr("BAD_REQUEST", "Invalid estimate params", 400, parsed.error.flatten());

      const { computeHours, modelSize } = parsed.data;
      const kgCo2e = Math.max(0, computeHours) * 0.05; // placeholder baseline
      return jsonOk({
        inputs: { computeHours, modelSize },
        estimate: { kgCo2e, note: "Placeholder estimate for v0.4." },
        nextAction: "projects",
      });
    }

    if (action === "projects") {
      const resp = await proxyJson(req, "/api/bridge/projects");
      if (!resp) return jsonErr("INTERNAL", "Unable to resolve base URL", 500);
      if (resp.status >= 400) return jsonErr("UPSTREAM_ERROR", "Bridge projects request failed", resp.status, resp.data);
      return jsonOk({ projects: resp.data, nextAction: "quote" });
    }

    if (action === "quote") {
      const parsed = QuoteSchema.safeParse({
        projectId: url.searchParams.get("projectId"),
        amount: url.searchParams.get("amount"),
        chain: url.searchParams.get("chain"),
        token: url.searchParams.get("token"),
      });
      if (!parsed.success) return jsonErr("BAD_REQUEST", "Invalid quote params", 400, parsed.error.flatten());

      const resp = await proxyJson(req, "/api/bridge/quote", { method: "POST", body: JSON.stringify(parsed.data) });
      if (!resp) return jsonErr("INTERNAL", "Unable to resolve base URL", 500);
      if (resp.status >= 400) return jsonErr("UPSTREAM_ERROR", "Bridge quote request failed", resp.status, resp.data);

      return jsonOk({ quote: resp.data, nextAction: "POST /api/agent/carbon to initiate retirement" });
    }

    if (action === "status") {
      const txHash = url.searchParams.get("txHash");
      if (!txHash) return jsonErr("BAD_REQUEST", "Missing txHash", 400);

      const resp = await proxyJson(req, `/api/bridge/tx?hash=${encodeURIComponent(txHash)}`);
      if (!resp) return jsonErr("INTERNAL", "Unable to resolve base URL", 500);
      if (resp.status >= 400) return jsonErr("UPSTREAM_ERROR", "Bridge tx status request failed", resp.status, resp.data);

      return jsonOk({ status: resp.data, nextAction: "verify" });
    }

    return jsonErr("BAD_REQUEST", `Unknown action: ${action}`, 400, { allowed: ["info", "estimate", "projects", "quote", "status"] });
  } catch (e: any) {
    return jsonErr("INTERNAL", "Unexpected error", 500, { message: e?.message });
  }
}

// POST /api/agent/carbon
export async function POST(req: NextRequest) {
  const ip = ipFromReq(req);
  const rl = rateLimitByIp(ip, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return jsonErr("RATE_LIMITED", "Too many requests", 429, { resetAt: rl.resetAt });

  try {
    const body = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) return jsonErr("BAD_REQUEST", "Invalid body", 400, parsed.error.flatten());

    const resp = await proxyJson(req, "/api/bridge/retire", { method: "POST", body: JSON.stringify(parsed.data) });
    if (!resp) return jsonErr("INTERNAL", "Unable to resolve base URL", 500);
    if (resp.status >= 400) return jsonErr("UPSTREAM_ERROR", "Bridge retire request failed", resp.status, resp.data);

    return jsonOk({
      retirement: resp.data,
      nextAction: "pay",
      note: "No funds move automatically. Response should contain explicit payment instructions.",
    });
  } catch (e: any) {
    return jsonErr("INTERNAL", "Unexpected error", 500, { message: e?.message });
  }
}
