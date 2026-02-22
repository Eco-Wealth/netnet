import type { MCPAdapter, MCPChain, MCPRequest, MCPResponse } from "../types";

function normalizeLatestBlock(data: unknown): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  const direct = record.latestBlock;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  const legacy = record.latestBlockNumber;
  if (typeof legacy === "number" && Number.isFinite(legacy)) return legacy;
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : undefined;
  if (!nested) return undefined;
  const nestedDirect = nested.latestBlock;
  if (typeof nestedDirect === "number" && Number.isFinite(nestedDirect)) {
    return nestedDirect;
  }
  const nestedLegacy = nested.latestBlockNumber;
  if (typeof nestedLegacy === "number" && Number.isFinite(nestedLegacy)) {
    return nestedLegacy;
  }
  return undefined;
}

export default class RegenKoiAdapter implements MCPAdapter {
  chain: MCPChain = "regen-koi";
  private endpoint: string;
  private apiKey?: string;

  constructor() {
    this.endpoint = String(process.env.REGEN_KOI_MCP_URL || "").trim();
    this.apiKey = String(process.env.REGEN_KOI_MCP_API_KEY || "").trim() || undefined;
  }

  private stub(req: MCPRequest): MCPResponse {
    if (req.method === "latest_block") {
      return { ok: true, data: { latestBlock: 12_500_000, stub: true } };
    }
    return { ok: true, data: { stub: true, chain: this.chain, req } };
  }

  async request(req: MCPRequest): Promise<MCPResponse> {
    if (!this.endpoint) {
      return this.stub(req);
    }

    try {
      const headers: HeadersInit = {
        "content-type": "application/json",
      };
      if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers,
        cache: "no-store",
        body: JSON.stringify({
          method: req.method,
          params: req.params ?? {},
        }),
      });
      if (!response.ok) {
        return { ok: false, error: `regen_koi_mcp_http_${response.status}` };
      }
      const payload = (await response.json()) as unknown;
      if (req.method === "latest_block") {
        const latestBlock = normalizeLatestBlock(payload);
        if (typeof latestBlock === "number") {
          return { ok: true, data: { latestBlock } };
        }
        return { ok: false, error: "regen_koi_mcp_invalid_latest_block" };
      }
      if (payload && typeof payload === "object") {
        const data = (payload as Record<string, unknown>).data;
        if (data !== undefined) return { ok: true, data };
      }
      return { ok: true, data: payload };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "regen_koi_mcp_request_failed",
      };
    }
  }
}

