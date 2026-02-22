export type IncentiveBpsConfig = {
  operatorBps: number;      // who approves/executes
  inferenceBps: number;     // AI provider budget bucket
  microRetireBps: number;   // micro-retire intent bucket
  treasuryBps: number;      // remainder / treasury
};

export type IncentiveAllocation = {
  bucket: "operator" | "inference" | "microRetire" | "treasury";
  bps: number;
  amountUsd?: number; // present only when an estimated USD basis exists
};

export type IncentivesPacket = {
  version: "netnet.econ.v1";
  action: string;
  basis: {
    token: string;
    chain: string;
    amountToken: string;
    estimatedUsd?: number;
  };
  config: IncentiveBpsConfig;
  allocations: IncentiveAllocation[];
  notes: string[];
};

export type IncentiveBasisInput = {
  action: string;
  token: string;
  chain: string;
  amountToken: string;      // keep as string to avoid float surprises
  estimatedUsd?: number;    // optional; if absent, allocations omit USD amounts
};
