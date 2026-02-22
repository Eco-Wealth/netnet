import type { IncentiveBpsConfig } from "./types";

const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.trunc(v)));

export function getIncentiveBpsConfig(): IncentiveBpsConfig {
  // Defaults are conservative and can be overridden via env.
  const operatorBps = clampInt(Number(process.env.NETNET_OPERATOR_BPS ?? 5000), 0, 10000);    // 50%
  const inferenceBps = clampInt(Number(process.env.NETNET_INFERENCE_BPS ?? 2000), 0, 10000);  // 20%
  const microRetireBps = clampInt(Number(process.env.NETNET_MICRORETIRE_BPS ?? 1000), 0, 10000); // 10%
  const used = operatorBps + inferenceBps + microRetireBps;
  const treasuryBps = clampInt(10000 - used, 0, 10000);

  return { operatorBps, inferenceBps, microRetireBps, treasuryBps };
}
