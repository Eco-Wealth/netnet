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
      const regenPromise = new RegenAdapter().getRegenStats();
      const basePromise = new BaseAdapter().getBaseStats();
      const [regenResponse, baseResponse] = await Promise.all([regenPromise, basePromise]);

      return {
        timestamp: Date.now(),
        regen: { latestBlock: regenResponse.latestBlockHeight },
        base: { latestBlock: baseResponse.latestBlockNumber },
      };
    } catch (error) {
      throw new Error('Failed to fetch market snapshot');
    }
  }
}

export default MCPClient;