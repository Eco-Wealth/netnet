type TokenActionDef = {
  action: string;
  label: string;
  safety: {
    autonomy: "READ_ONLY" | "PROPOSE_ONLY" | "EXECUTE_WITH_LIMITS";
    maxUsdHint?: number;
    notes?: string;
  };
  whatWillHappen: (params: Record<string, unknown>) => string;
  estimatedCosts: (params: Record<string, unknown>) => string;
};

export async function getBankrTokenInfo(): Promise<Record<string, unknown>> {
  // Read-only placeholder. Unit 42 provides wallet state; Unit 30 provides token ops wiring.
  return {
    provider: "bankr",
    mode: "READ_ONLY",
    token: null,
    feeRouting: null,
    notes: "This is a scaffold endpoint. Wire real Bankr queries in Unit 30/42."
  };
}

export function tokenActionCatalog(): TokenActionDef[] {
  return [
    {
      action: "launch",
      label: "Launch token (proposal)",
      safety: { autonomy: "PROPOSE_ONLY", maxUsdHint: 25, notes: "Operator must approve before any on-chain action." },
      whatWillHappen: (p) =>
        `Propose a token launch using Bankr with params: ${JSON.stringify(p)}.`,
      estimatedCosts: () => "Est. gas + creation fees vary by chain/venue. Provide chain + venue for better estimate."
    },
    {
      action: "fee_route",
      label: "Set fee routing (proposal)",
      safety: { autonomy: "PROPOSE_ONLY", maxUsdHint: 10 },
      whatWillHappen: (p) =>
        `Propose fee routing updates (operator/inference/micro-retire/treasury) with params: ${JSON.stringify(p)}.`,
      estimatedCosts: () => "Est. minimal gas; may require multiple tx depending on routing primitive."
    },
    {
      action: "status",
      label: "Read status (proposal-only surface)",
      safety: { autonomy: "READ_ONLY" },
      whatWillHappen: () => "Fetch and summarize token status via Bankr (not yet wired).",
      estimatedCosts: () => "0 (read-only)."
    }
  ];
}
