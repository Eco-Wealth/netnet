export type MCPChain = "regen" | "base" | "eth";

export interface MCPRequest {
  method: string;
  params?: unknown;
}

export interface MCPResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface MCPAdapter {
  chain: MCPChain;
  request(req: MCPRequest): Promise<MCPResponse>;
}

export type MarketSnapshot = {
  timestamp: number;
  regen: { latestBlock: number };
  base: { latestBlock: number };
};