import type { MCPAdapter, MCPChain, MCPRequest, MCPResponse } from "../types";

export class EthAdapter implements MCPAdapter {
  chain: MCPChain = "eth";

  async request(req: MCPRequest): Promise<MCPResponse> {
    if (req.method === "latestBlock") {
      // stub for now; wire to ETH RPC later
      return { ok: true, data: 0 };
    }
    return { ok: false, error: `Unsupported method: ${req.method}` };
  }
}
