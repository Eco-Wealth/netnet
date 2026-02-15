type MCPChain = "regen" | "base" | "eth";

interface MCPRequest {
  method: string;
  params?: unknown;
}

interface MCPResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface MCPAdapter {
  chain: MCPChain;
  request(req: MCPRequest): Promise<MCPResponse>;
}