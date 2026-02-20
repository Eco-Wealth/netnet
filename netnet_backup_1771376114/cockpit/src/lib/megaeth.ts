export type MegaEthChain = {
  id: number;
  name: string;
  rpcUrls: string[];
  explorerBaseUrl: string;
  nativeSymbol: string;
};

/**
 * Unit 54: MegaETH read-only pack (no execution, no keys).
 * Keep this conservative: only provide chain metadata + link helpers.
 *
 * NOTE: If MegaETH chain params change, update these constants.
 */
export const MEGAETH: MegaEthChain = {
  // Placeholder chain id until stabilized—override via env if needed.
  id: Number(process.env.MEGAETH_CHAIN_ID ?? 0),
  name: process.env.MEGAETH_NAME ?? "MegaETH",
  rpcUrls: (process.env.MEGAETH_RPC_URLS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  explorerBaseUrl: (process.env.MEGAETH_EXPLORER_BASE_URL ?? "").replace(/\/$/, ""),
  nativeSymbol: process.env.MEGAETH_NATIVE_SYMBOL ?? "ETH",
};

export function megaethExplorerTx(tx: string): string | null {
  if (!MEGAETH.explorerBaseUrl) return null;
  const clean = tx?.trim();
  if (!clean) return null;
  return `${MEGAETH.explorerBaseUrl}/tx/${clean}`;
}

export function megaethExplorerAddress(address: string): string | null {
  if (!MEGAETH.explorerBaseUrl) return null;
  const clean = address?.trim();
  if (!clean) return null;
  return `${MEGAETH.explorerBaseUrl}/address/${clean}`;
}

export function megaethReady(): { ok: boolean; reasons?: string[] } {
  const reasons: string[] = [];
  if (!MEGAETH.rpcUrls.length) reasons.push("MEGAETH_RPC_URLS missing");
  if (!MEGAETH.explorerBaseUrl) reasons.push("MEGAETH_EXPLORER_BASE_URL missing");
  return reasons.length ? { ok: false, reasons } : { ok: true };
}
