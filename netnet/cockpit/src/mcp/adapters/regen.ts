import type { MCPAdapter, MCPChain, MCPRequest, MCPResponse } from "../types";

export class RegenAdapter implements MCPAdapter {
  chain: MCPChain = "regen";

  async request(req: MCPRequest): Promise<MCPResponse> {
    if (req.method === "latestBlock") {
      // stub for now; wire to real RPC/MCP later
      return { ok: true, data: 0 };
    }
    return { ok: false, error: `Unsupported method: ${req.method}` };
  }
}
