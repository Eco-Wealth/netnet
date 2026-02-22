import type { MCPAdapter, MCPChain, MCPRequest, MCPResponse } from "../types";

export default class BaseAdapter implements MCPAdapter {
  chain: MCPChain = "base";

  async request(req: MCPRequest): Promise<MCPResponse> {
    if (req.method === "latest_block") {
      return { ok: true, data: { latestBlock: 18_500_000 } };
    }
    return { ok: true, data: { stub: true, chain: this.chain, req } };
  }
}
