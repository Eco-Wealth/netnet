export type AllocationPolicy = {
  operatorPct: number;        // 0..1
  inferencePct: number;       // 0..1
  microRetirePct: number;     // 0..1
  treasuryPct: number;        // 0..1
  minOperatorUsd?: number;    // optional floor
  minInferenceUsd?: number;   // optional floor
  minMicroRetireUsd?: number; // optional floor
};

export type AllocationInput = {
  realizedFeesUsd: number; // fees/profits realized since last sweep
  inferenceSpendUsd?: number; // optional actual spend (for reporting)
  note?: string;
};

export type AllocationResult = {
  ok: true;
  input: AllocationInput;
  policy: AllocationPolicy;
  allocations: {
    operatorUsd: number;
    inferenceUsd: number;
    microRetireUsd: number;
    treasuryUsd: number;
  };
  totals: { allocatedUsd: number; residualUsd: number };
  nextAction: "OPERATOR_APPROVAL_REQUIRED";
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeAllocations(input: AllocationInput, policy: AllocationPolicy): AllocationResult {
  const total = Math.max(0, Number(input.realizedFeesUsd || 0));
  const p = {
    operatorPct: clamp(policy.operatorPct ?? 0.25, 0, 1),
    inferencePct: clamp(policy.inferencePct ?? 0.25, 0, 1),
    microRetirePct: clamp(policy.microRetirePct ?? 0.25, 0, 1),
    treasuryPct: clamp(policy.treasuryPct ?? 0.25, 0, 1),
    minOperatorUsd: policy.minOperatorUsd ?? 0,
    minInferenceUsd: policy.minInferenceUsd ?? 0,
    minMicroRetireUsd: policy.minMicroRetireUsd ?? 0,
  };

  // Normalize pct if it doesn't sum to 1.
  const sum = p.operatorPct + p.inferencePct + p.microRetirePct + p.treasuryPct;
  const norm = sum > 0 ? sum : 1;
  const opPct = p.operatorPct / norm;
  const infPct = p.inferencePct / norm;
  const mrPct = p.microRetirePct / norm;
  const trPct = p.treasuryPct / norm;

  let operatorUsd = total * opPct;
  let inferenceUsd = total * infPct;
  let microRetireUsd = total * mrPct;
  let treasuryUsd = total * trPct;

  // Apply floors (conservatively, by taking from treasury first).
  const floors = [
    ["operatorUsd", p.minOperatorUsd] as const,
    ["inferenceUsd", p.minInferenceUsd] as const,
    ["microRetireUsd", p.minMicroRetireUsd] as const,
  ];

  for (const [k, floor] of floors) {
    const current = k === "operatorUsd" ? operatorUsd : k === "inferenceUsd" ? inferenceUsd : microRetireUsd;
    if (current < floor) {
      const delta = floor - current;
      const take = Math.min(delta, treasuryUsd);
      if (take > 0) {
        treasuryUsd -= take;
        if (k === "operatorUsd") operatorUsd += take;
        if (k === "inferenceUsd") inferenceUsd += take;
        if (k === "microRetireUsd") microRetireUsd += take;
      }
    }
  }

  operatorUsd = round2(operatorUsd);
  inferenceUsd = round2(inferenceUsd);
  microRetireUsd = round2(microRetireUsd);
  treasuryUsd = round2(treasuryUsd);

  const allocatedUsd = round2(operatorUsd + inferenceUsd + microRetireUsd + treasuryUsd);
  const residualUsd = round2(total - allocatedUsd);

  return {
    ok: true,
    input: { ...input, realizedFeesUsd: total },
    policy: policy,
    allocations: { operatorUsd, inferenceUsd, microRetireUsd, treasuryUsd },
    totals: { allocatedUsd, residualUsd },
    nextAction: "OPERATOR_APPROVAL_REQUIRED",
  };
}
