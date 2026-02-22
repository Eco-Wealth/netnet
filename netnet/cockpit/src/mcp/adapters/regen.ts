import type { MCPAdapter, MCPChain, MCPRequest, MCPResponse } from "../types";

export default class RegenAdapter implements MCPAdapter {
  chain: MCPChain = "regen";

  async request(req: MCPRequest): Promise<MCPResponse> {
    if (req.method === "latest_block") {
      return { ok: true, data: { latestBlock: 12_500_000 } };
    }
    return { ok: true, data: { stub: true, chain: this.chain, req } };
  }
}
