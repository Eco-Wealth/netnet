import type {
  MCPAdapter,
  MCPChain,
  MCPRequest,
  MCPResponse,
  MarketSnapshot
} from './types';

import RegenAdapter from './adapters/regen';
import BaseAdapter from './adapters/base';
import EthAdapter from './adapters/eth';

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
      const regen = await this.request("regen", { method: "latestBlock" });
      const base = await this.request("base", { method: "latestBlock" });

      return {
        timestamp: Date.now(),
        regen: { latestBlock: Number(regen.data ?? 0) },
        base: { latestBlock: Number(base.data ?? 0) }
      };
    } catch {
      throw new Error("Failed to fetch market snapshot");
    }
  }
}

export default MCPClient;
