import { getIncentiveBpsConfig as getIncentiveBpsConfigImpl } from "./economics/config";

export { computeIncentivesPacket } from "./economics/routing";
export type { IncentivesPacket, IncentiveBpsConfig, IncentiveBasisInput } from "./economics/types";
export { getIncentiveBpsConfig } from "./economics/config";

export function feeRouting(estimatedUsd: number) {
  const usd = Number.isFinite(estimatedUsd) ? estimatedUsd : 0;
  const config = getIncentiveBpsConfigImpl();
  const alloc = (bps: number) => Number(((usd * bps) / 10000).toFixed(6));
  return {
    estimatedUsd: usd,
    config,
    allocations: {
      operatorUsd: alloc(config.operatorBps),
      inferenceUsd: alloc(config.inferenceBps),
      microRetireUsd: alloc(config.microRetireBps),
      treasuryUsd: alloc(config.treasuryBps),
    },
  };
}
