export const BRIDGE_ECO_API_BASE =
  process.env.BRIDGE_ECO_API_BASE ?? "https://api.bridge.eco";

export const ECOTOKEN_SCAN_BASE =
  process.env.ECOTOKEN_SCAN_BASE ?? "https://scan.ecotoken.earth";

export function env() {
  return {
    BRIDGE_ECO_API_BASE,
    ECOTOKEN_SCAN_BASE,
    BANKR_API_BASE_URL: process.env.BANKR_API_BASE_URL ?? "",
  };
}
