class BaseAdapter implements MCPAdapter {
  chain: MCPChain = "base";
  async request(req: MCPRequest): Promise<MCPResponse> {
    return { ok: true, data: { stub: true, chain: this.chain } };
  }
}

export default BaseAdapter;