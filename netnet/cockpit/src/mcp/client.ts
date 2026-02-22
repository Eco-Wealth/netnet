import { MCPAdapter, MCPChain, MCPRequest, MCPResponse, MarketSnapshot } from './types';

function parseLatestBlock(response: MCPResponse): number {
  const value = (response.data as { latestBlock?: unknown } | undefined)?.latestBlock;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

class MCPClient {
  private adapters: MCPAdapter[];

  constructor(adapters: MCPAdapter[]) {
    this.adapters = adapters;
  }

  getAdapter(chain: MCPChain): MCPAdapter {
    return this.adapters.find(adapter => adapter.chain === chain)!;
  }

  async request(chain: MCPChain, req: MCPRequest): Promise<MCPResponse> {
    const adapter = this.getAdapter(chain);
    return adapter.request(req);
  }

  async getMarketSnapshot(): Promise<MarketSnapshot> {
    try {
      const regenPromise = this.request("regen", { method: "latest_block" });
      const basePromise = this.request("base", { method: "latest_block" });
      const [regenResponse, baseResponse] = await Promise.all([regenPromise, basePromise]);

      return {
        timestamp: Date.now(),
        regen: { latestBlock: parseLatestBlock(regenResponse) },
        base: { latestBlock: parseLatestBlock(baseResponse) },
      };
    } catch {
      throw new Error('Failed to fetch market snapshot');
    }
  }
}

export default MCPClient;
