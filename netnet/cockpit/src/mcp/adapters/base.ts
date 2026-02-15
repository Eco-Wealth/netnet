import axios from 'axios';

class BaseAdapter implements MCPAdapter {
  chain: MCPChain = "base";

  async request(req: MCPRequest): Promise<MCPResponse> {
    return { ok: true, data: { stub: true, chain: this.chain } };
  }

  async getBaseStats(): Promise<{ chainId: string; latestBlockNumber: number }> {
    try {
      const response = await axios.post('https://mainnet.base.org', { method: 'eth_blockNumber' });
      const latestBlockNumber = parseInt(response.data.result, 16);
      return { chainId: 'base-mainnet', latestBlockNumber };
    } catch (error) {
      throw new Error('Failed to fetch data from Base RPC');
    }
  }
}

export default BaseAdapter;