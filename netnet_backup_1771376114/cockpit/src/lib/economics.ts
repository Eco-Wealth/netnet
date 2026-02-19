export { computeIncentivesPacket } from "./economics/routing";
export type { IncentivesPacket, IncentiveBpsConfig, IncentiveBasisInput } from "./economics/types";
export { getIncentiveBpsConfig } from "./economics/config";
import { computeIncentivesPacket } from "./economics/routing";

// Back-compat helper retained for older routes/docs.
export function feeRouting(estimatedUsd = 0) {
  return computeIncentivesPacket({
    action: "generic",
    token: "USDC",
    chain: "base",
    amountToken: String(estimatedUsd),
    estimatedUsd,
  });
}
