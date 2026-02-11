import { getIncentiveBpsConfig } from "@/lib/economics";
import { readLedgerSummarySafe } from "@/lib/revenue/ledgerCompat";

export type RevenueInfo = {
  ok: true;
  service: "netnet-cockpit";
  revenue: {
    primitives: string[];
    note: string;
  };
  nextAction: string;
};

export type RevenueReport = {
  ok: true;
  windowDays: number;
  totals: {
    inferredUsdSpend: number;
    realizedFeesUsd: number;
    microRetireUsd: number;
    netUsd: number;
  };
  incentives: {
    treasuryBps: number;
    operatorBps: number;
    inferenceBps: number;
    microRetireBps: number;
  };
  sources: {
    ledger: "native" | "compat" | "missing";
  };
  notes: string[];
};

export async function getRevenueInfo(): Promise<RevenueInfo> {
  return {
    ok: true,
    service: "netnet-cockpit",
    revenue: {
      primitives: ["token_fees", "trading_pnl", "inference_spend", "micro_retire_intent"],
      note: "Read-only by default. Use report to see last-N-day rollups. Execution remains operator-gated.",
    },
    nextAction: "GET /api/agent/revenue?action=report&days=7",
  };
}

export async function getRevenueReport(args: { days: number }): Promise<RevenueReport> {
  const windowDays = Math.max(1, Math.min(365, Math.floor(args.days || 7)));
  const incentives = getIncentiveBpsConfig();
  const fallback = {
    treasuryBps: 5000,
    operatorBps: 2000,
    inferenceBps: 2000,
    microRetireBps: 1000,
  };

  const ledger = await readLedgerSummarySafe({ days: windowDays });

  const inferredUsdSpend = ledger.inferredUsdSpend ?? 0;
  const realizedFeesUsd = ledger.realizedFeesUsd ?? 0;
  const microRetireUsd = ledger.microRetireUsd ?? 0;

  const netUsd = realizedFeesUsd - inferredUsdSpend - microRetireUsd;

  const notes: string[] = [];
  if (ledger.source !== "native") notes.push("Ledger compat mode: revenue is a best-effort rollup.");
  if (realizedFeesUsd === 0) notes.push("No realized fees recorded yet. Bankr token ops/trading will populate this over time.");
  if (inferredUsdSpend > 0 && realizedFeesUsd === 0) notes.push("Inference costs are being tracked before revenue is realized. Consider tightening caps/policy.");

  return {
    ok: true,
    windowDays,
    totals: { inferredUsdSpend, realizedFeesUsd, microRetireUsd, netUsd },
    incentives: {
      treasuryBps: incentives?.treasuryBps ?? fallback.treasuryBps,
      operatorBps: incentives?.operatorBps ?? fallback.operatorBps,
      inferenceBps: incentives?.inferenceBps ?? fallback.inferenceBps,
      microRetireBps: incentives?.microRetireBps ?? fallback.microRetireBps,
    },
    sources: { ledger: ledger.source },
    notes,
  };
}
