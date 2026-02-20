type Summary = {
  source: "native" | "compat" | "missing";
  inferredUsdSpend?: number;
  realizedFeesUsd?: number;
  microRetireUsd?: number;
};

/**
 * Best-effort adapter so Unit 47 can compile even if Unit 31's ledger module changes.
 * If a native ledger implementation exists, it will be used; otherwise returns zeros.
 */
export async function readLedgerSummarySafe(args: { days: number }): Promise<Summary> {
  // Try common module locations without creating hard compile-time deps.
  const candidates = [
    "@/lib/accounting",
    "@/lib/ledger",
    "@/lib/agentAccounting",
    "@/lib/accounting/index",
  ];

  for (const mod of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const m = require(mod);
      if (typeof m?.getLedgerSummary === "function") {
        const s = await m.getLedgerSummary(args);
        return { source: "native", ...normalize(s) };
      }
      if (typeof m?.readLedgerSummary === "function") {
        const s = await m.readLedgerSummary(args);
        return { source: "native", ...normalize(s) };
      }
    } catch {
      // ignore
    }
  }

  // Compat: look for a simple JSON snapshot if present.
  try {
    const fs = require("fs");
    const path = require("path");
    const p = path.join(process.cwd(), ".netnet", "ledger-summary.json");
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, "utf8"));
      return { source: "compat", ...normalize(raw) };
    }
  } catch {
    // ignore
  }

  return { source: "missing", inferredUsdSpend: 0, realizedFeesUsd: 0, microRetireUsd: 0 };
}

function normalize(x: any) {
  const n = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    inferredUsdSpend: n(x?.inferredUsdSpend ?? x?.inferenceUsd ?? x?.inferenceSpendUsd),
    realizedFeesUsd: n(x?.realizedFeesUsd ?? x?.feesUsd ?? x?.realizedUsd),
    microRetireUsd: n(x?.microRetireUsd ?? x?.microRetireIntentUsd ?? x?.retireUsd),
  };
}
