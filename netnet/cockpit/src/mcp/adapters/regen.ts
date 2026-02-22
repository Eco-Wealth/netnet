import type { MCPAdapter, MCPChain, MCPRequest, MCPResponse } from "../types";

export default class RegenAdapter implements MCPAdapter {
  chain: MCPChain = "regen";
  private endpoint: string;
  private apiKey?: string;

  constructor() {
    this.endpoint = String(process.env.REGEN_MCP_URL || "").trim();
    this.apiKey = String(process.env.REGEN_MCP_API_KEY || "").trim() || undefined;
  }

  private stub(req: MCPRequest): MCPResponse {
    if (req.method === "latest_block") {
      return { ok: true, data: { latestBlock: 12_500_000, stub: true } };
    }
    return { ok: true, data: { stub: true, chain: this.chain, req } };
  }

  private normalizeLatestBlock(data: unknown): number | undefined {
    if (!data || typeof data !== "object") return undefined;
    const record = data as Record<string, unknown>;
    const direct = record.latestBlock;
    if (typeof direct === "number" && Number.isFinite(direct)) return direct;
    const latestBlockNumber = record.latestBlockNumber;
    if (typeof latestBlockNumber === "number" && Number.isFinite(latestBlockNumber)) {
      return latestBlockNumber;
    }
    const nested =
      record.data && typeof record.data === "object"
        ? (record.data as Record<string, unknown>)
        : undefined;
    if (nested) {
      const nestedDirect = nested.latestBlock;
      if (typeof nestedDirect === "number" && Number.isFinite(nestedDirect)) {
        return nestedDirect;
      }
      const nestedLegacy = nested.latestBlockNumber;
      if (typeof nestedLegacy === "number" && Number.isFinite(nestedLegacy)) {
        return nestedLegacy;
      }
    }
    return undefined;
  }

  private async requestLatestBlockViaGet(): Promise<MCPResponse | null> {
    if (!this.endpoint) return null;
    const url = new URL(this.endpoint);
    const headers: HeadersInit = {};
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    const response = await fetch(url.toString(), { method: "GET", headers, cache: "no-store" });
    if (!response.ok) {
      return { ok: false, error: `regen_mcp_http_${response.status}` };
    }
    const payload = (await response.json()) as unknown;
    const latestBlock = this.normalizeLatestBlock(payload);
    if (typeof latestBlock === "number") {
      return { ok: true, data: { latestBlock } };
    }
    return { ok: false, error: "regen_mcp_invalid_latest_block" };
  }

  private async requestViaJsonRpc(req: MCPRequest): Promise<MCPResponse> {
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
      return { ok: false, error: `regen_mcp_http_${response.status}` };
    }
    const payload = (await response.json()) as unknown;

    if (req.method === "latest_block") {
      const latestBlock = this.normalizeLatestBlock(payload);
      if (typeof latestBlock === "number") {
        return { ok: true, data: { latestBlock } };
      }
      return { ok: false, error: "regen_mcp_invalid_latest_block" };
    }

    if (payload && typeof payload === "object") {
      const data = (payload as Record<string, unknown>).data;
      if (data !== undefined) return { ok: true, data };
    }
    return { ok: true, data: payload as Record<string, unknown> };
  }

  async request(req: MCPRequest): Promise<MCPResponse> {
    if (!this.endpoint) {
      return this.stub(req);
    }

    try {
      if (req.method === "latest_block") {
        const latestViaGet = await this.requestLatestBlockViaGet();
        if (latestViaGet?.ok) return latestViaGet;
        if (latestViaGet && !latestViaGet.ok) return latestViaGet;
      }
      return await this.requestViaJsonRpc(req);
    } catch (error) {
      if (req.method === "latest_block") {
        return {
          ok: true,
          data: {
            latestBlock: 12_500_000,
            stub: true,
            fallbackReason: error instanceof Error ? error.message : String(error),
          },
        };
      }
      return {
        ok: false,
        error: error instanceof Error ? error.message : "regen_mcp_request_failed",
      };
    }
  }
}
