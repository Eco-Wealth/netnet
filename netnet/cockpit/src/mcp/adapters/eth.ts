import type { MCPAdapter, MCPChain, MCPRequest, MCPResponse } from "../types";

export default class EthAdapter implements MCPAdapter {
  chain: MCPChain = "eth";

  async request(req: MCPRequest): Promise<MCPResponse> {
    if (req.method === "latest_block") {
      return { ok: true, data: { latestBlock: 19_000_000 } };
    }
    return { ok: true, data: { stub: true, chain: this.chain, req } };
  }
}
