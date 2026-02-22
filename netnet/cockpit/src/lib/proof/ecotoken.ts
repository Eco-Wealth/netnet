import { buildEcoTokenScanUrl } from "@/lib/ecotoken";

export function addEcoTokenRefs(refs: Record<string, any>, txHash?: string | null) {
  if (!txHash) return refs;
  const url = buildEcoTokenScanUrl(txHash);
  if (!url) return refs;
  return { ...refs, ecoTokenScanUrl: url };
}
