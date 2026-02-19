import axios from 'axios';
import { MCPAdapter, MCPChain, MCPRequest, MCPResponse } from '../types';

class RegenAdapter implements MCPAdapter {
  chain: MCPChain = "regen";

  async request(_req: MCPRequest): Promise<MCPResponse> {
    return { ok: true, data: { stub: true, chain: this.chain } };
  }

  async getRegenStats(): Promise<{ chainId: string; latestBlockHeight: number }> {
    try {
      const response = await axios.get('https://api.regen.network/cosmos/base/tendermint/v1beta1/blocks/latest');
      const latestBlockHeight = response.data.block.header.height;
      return { chainId: 'regen-1', latestBlockHeight };
    } catch {
      throw new Error('Failed to fetch data from Regen API');
    }
  }
}

export default RegenAdapter;