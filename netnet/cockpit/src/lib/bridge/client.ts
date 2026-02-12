import { fetchJson } from "@/lib/http";

const DEFAULT_BASE = "https://api.bridge.eco";

type CacheEntry = { expiresAt: number; value: any };
const cache = new Map<string, CacheEntry>();

function now() {
  return Date.now();
}

function cacheGet(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key: string, value: any, ttlMs: number) {
  cache.set(key, { value, expiresAt: now() + ttlMs });
}

export type BridgeConfig = {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

export function getBridgeConfig(): BridgeConfig {
  const baseUrl = process.env.BRIDGE_API_BASE_URL || process.env.BRIDGE_ECO_API_BASE || DEFAULT_BASE;
  const apiKey = process.env.BRIDGE_API_KEY || undefined;
  const timeoutMsRaw = Number(process.env.BRIDGE_TIMEOUT_MS || "12000");
  const timeoutMs = Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0 ? timeoutMsRaw : 12000;
  return { baseUrl, apiKey, timeoutMs };
}

export function resetBridgeClientCacheForTests() {
  cache.clear();
}

function authHeaders(cfg: BridgeConfig) {
  // Bridge may use different auth schemes. Keep it flexible.
  // If BRIDGE_API_KEY is set, we send it as:
  // - Authorization: Bearer <key>
  // - X-API-Key: <key>
  // Bridge can ignore one if not applicable.
  if (!cfg.apiKey) return {} as Record<string, string>;
  return {
    Authorization: `Bearer ${cfg.apiKey}`,
    "X-API-Key": cfg.apiKey,
  };
}

export async function bridgeGet<T>(path: string, searchParams?: Record<string, string | undefined>, ttlMs?: number) {
  const cfg = getBridgeConfig();
  const url = new URL(path, cfg.baseUrl);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }

  const key = `GET:${url.toString()}`;
  if (ttlMs && ttlMs > 0) {
    const cached = cacheGet(key);
    if (cached) return { ok: true as const, status: 200, data: cached };
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...authHeaders(cfg),
  };

  const res = await fetchJson<T>(url.toString(), {
    method: "GET",
    headers,
    timeoutMs: cfg.timeoutMs,
  });

  if (res.ok && ttlMs && ttlMs > 0) {
    cacheSet(key, res.data, ttlMs);
  }

  return res;
}

export async function bridgePost<T>(path: string, body: unknown) {
  const cfg = getBridgeConfig();
  const url = new URL(path, cfg.baseUrl);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...authHeaders(cfg),
  };

  return fetchJson<T>(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    timeoutMs: cfg.timeoutMs,
  });
}
