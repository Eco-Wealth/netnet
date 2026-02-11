import { getIncentiveBpsConfig as getIncentiveBpsConfigImpl } from "./economics/config";
import { computeIncentivesPacket } from "./economics/routing";

export { computeIncentivesPacket };
export type { IncentivesPacket, IncentiveBpsConfig, IncentiveBasisInput } from "./economics/types";
export { getIncentiveBpsConfig } from "./economics/config";

export function feeRouting(estimatedUsd: number) {
  const usd = Number.isFinite(estimatedUsd) ? estimatedUsd : 0;
  return computeIncentivesPacket({
    action: "generic",
    token: "USDC",
    chain: "base",
    amountToken: String(usd),
    estimatedUsd: usd,
  });
}
