export type ChainKind = "evm" | "cosmos";

export type EvmChain = {
  kind: "evm";
  id: number; // EVM chainId
  name: string;
  rpcUrl: string;
  explorerBaseUrl?: string;
  nativeSymbol: string;
};

export type CosmosChain = {
  kind: "cosmos";
  chainId: string;
  name: string;
  rpcUrl: string;
  restUrl?: string;
  explorerBaseUrl?: string;
  nativeDenom: string;
  nativeSymbol: string;
};

export type Chain = EvmChain | CosmosChain;

/**
 * Minimal multi-chain registry used by skills and agent endpoints.
 * Keep this small + explicit; add chains deliberately.
 */
export const CHAINS: Record<string, Chain> = {
  // EVM
  base: {
    kind: "evm",
    id: 8453,
    name: "Base",
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    explorerBaseUrl: "https://basescan.org",
    nativeSymbol: "ETH",
  },
  megaeth_testnet: {
    kind: "evm",
    id: 6342,
    name: "MegaETH Testnet",
    rpcUrl: process.env.MEGAETH_RPC_URL || "https://carrot.megaeth.com/rpc",
    explorerBaseUrl: "https://explorer-testnet.megaeth.com",
    nativeSymbol: "ETH",
  },

  // Cosmos
  regen_mainnet: {
    kind: "cosmos",
    chainId: "regen-1",
    name: "Regen Mainnet",
    rpcUrl: process.env.REGEN_RPC_URL || "https://rpc.regen.network:443",
    restUrl: process.env.REGEN_REST_URL || "https://api.regen.network",
    explorerBaseUrl: "https://www.mintscan.io/regen",
    nativeDenom: "uregen",
    nativeSymbol: "REGEN",
  },
};

export function listChains() {
  return Object.entries(CHAINS).map(([key, c]) => ({ key, ...c }));
}

export function getChain(key: string): Chain | undefined {
  return CHAINS[key];
}
