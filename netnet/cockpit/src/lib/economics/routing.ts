import type { IncentiveBasisInput, IncentivesPacket, IncentiveAllocation } from "./types";
import { getIncentiveBpsConfig } from "./config";

function toNumberMaybe(amountToken: string): number | undefined {
  const n = Number(amountToken);
  return Number.isFinite(n) ? n : undefined;
}

function estimateUsdFromBasis(input: IncentiveBasisInput): number | undefined {
  if (typeof input.estimatedUsd === "number" && Number.isFinite(input.estimatedUsd)) return input.estimatedUsd;

  // Minimal safe inference:
  // - If token is USDC, treat amountToken as USD.
  // - Otherwise, do NOT guess prices.
  if (input.token.toUpperCase() === "USDC") {
    const n = toNumberMaybe(input.amountToken);
    if (typeof n === "number") return n;
  }
  return undefined;
}

export function computeIncentivesPacket(input: IncentiveBasisInput): IncentivesPacket {
  const config = getIncentiveBpsConfig();
  const estimatedUsd = estimateUsdFromBasis(input);

  const mk = (bucket: IncentiveAllocation["bucket"], bps: number): IncentiveAllocation => {
    const allocation: IncentiveAllocation = { bucket, bps };
    if (typeof estimatedUsd === "number") allocation.amountUsd = Number(((estimatedUsd * bps) / 10000).toFixed(6));
    return allocation;
  };

  const allocations: IncentiveAllocation[] = [
    mk("operator", config.operatorBps),
    mk("inference", config.inferenceBps),
    mk("microRetire", config.microRetireBps),
    mk("treasury", config.treasuryBps),
  ];

  const notes: string[] = [];
  if (typeof estimatedUsd !== "number") {
    notes.push("No USD basis available; allocations include BPS only. Provide estimatedUsd for exact USD splits.");
  }
  notes.push("All values are planning metadata. Execution remains operator-approved elsewhere.");

  return {
    version: "netnet.econ.v1",
    action: input.action,
    basis: {
      token: input.token,
      chain: input.chain,
      amountToken: input.amountToken,
      ...(typeof estimatedUsd === "number" ? { estimatedUsd } : {}),
    },
    config,
    allocations,
    notes,
  };
}
