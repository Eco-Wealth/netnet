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
}

export default MCPClient;