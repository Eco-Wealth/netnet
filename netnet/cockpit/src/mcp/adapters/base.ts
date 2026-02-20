import axios from 'axios';
import { MCPAdapter, MCPChain, MCPRequest, MCPResponse } from '../types';

class BaseAdapter implements MCPAdapter {
  chain: MCPChain = "base";

  async request(_req: MCPRequest): Promise<MCPResponse> {
    return { ok: true, data: { stub: true, chain: this.chain } };
  }

  async getBaseStats(): Promise<{ chainId: string; latestBlockNumber: number }> {
    try {
      const response = await axios.post('https://mainnet.base.org', { method: 'eth_blockNumber' });
      const latestBlockNumber = parseInt(response.data.result, 16);
      return { chainId: 'base-mainnet', latestBlockNumber };
    } catch {
      throw new Error('Failed to fetch data from Base RPC');
    }
  }
}

export default BaseAdapter;