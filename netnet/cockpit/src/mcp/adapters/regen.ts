class RegenAdapter implements MCPAdapter {
  chain: MCPChain = "regen";
  async request(req: MCPRequest): Promise<MCPResponse> {
    return { ok: true, data: { stub: true, chain: this.chain } };
  }
}

export default RegenAdapter;