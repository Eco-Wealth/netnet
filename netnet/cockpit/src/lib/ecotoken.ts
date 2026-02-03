import { ECOTOKEN_SCAN_BASE } from "@/lib/env";

/**
 * ecoToken's public verification UI is scan.ecotoken.earth.
 * The site is a SPA and may not support stable deep-linking to a transaction.
 * So we return the scan home + the tx hash separately.
 */
export function getEcoTokenScanInfo(txHash: string) {
  return {
    scanBase: ECOTOKEN_SCAN_BASE,
    scanUrl: ECOTOKEN_SCAN_BASE,
    txHash,
    instruction:
      "Open scan.ecotoken.earth and search/paste the tx hash to verify the retirement and certificate.",
  };
}
