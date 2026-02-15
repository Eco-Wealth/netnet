import type { MCPAdapter, MCPChain, MCPRequest, MCPResponse } from "../types";

export class BaseAdapter implements MCPAdapter {
  chain: MCPChain = "base";

  async request(req: MCPRequest): Promise<MCPResponse> {
    if (req.method === "latestBlock") {
      // stub for now; wire to Base RPC later
      return { ok: true, data: 0 };
    }
    return { ok: false, error: `Unsupported method: ${req.method}` };
  }
}
