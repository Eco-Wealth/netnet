import type { MCPAdapter, MCPChain, MCPRequest, MCPResponse, MarketSnapshot } from "./types";

export default class MCPClient {
  private adapters: MCPAdapter[];

  constructor(adapters: MCPAdapter[]) {
    this.adapters = adapters;
  }

  getAdapter(chain: MCPChain): MCPAdapter {
    const a = this.adapters.find(x => x.chain === chain);
    if (!a) throw new Error(`Missing adapter for chain: ${chain}`);
    return a;
  }

  async request(chain: MCPChain, req: MCPRequest): Promise<MCPResponse> {
    return this.getAdapter(chain).request(req);
  }

  async getMarketSnapshot(): Promise<MarketSnapshot> {
    const [regen, base, eth] = await Promise.all([
      this.request("regen", { method: "latestBlock" }),
      this.request("base", { method: "latestBlock" }),
      this.request("eth", { method: "latestBlock" }),
    ]);

    return {
      timestamp: Date.now(),
      regen: { latestBlock: Number(regen.data ?? 0) },
      base: { latestBlock: Number(base.data ?? 0) },
      eth: { latestBlock: Number(eth.data ?? 0) },
    };
  }
}
