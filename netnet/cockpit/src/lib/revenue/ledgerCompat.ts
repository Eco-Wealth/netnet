import fs from "node:fs";
import path from "node:path";

type Summary = {
  source: "native" | "compat" | "missing";
  inferredUsdSpend?: number;
  realizedFeesUsd?: number;
  microRetireUsd?: number;
};

type LedgerSummaryReader = (args: { days: number }) => unknown | Promise<unknown>;

const COMPAT_SNAPSHOT_PATHS = [
  path.join(process.cwd(), ".netnet", "ledger-summary.json"),
  path.join(process.cwd(), "data", "ledger-summary.json"),
];

declare global {
  // eslint-disable-next-line no-var
  var __NETNET_LEDGER_SUMMARY_READER__: LedgerSummaryReader | undefined;
}

/**
 * Best-effort adapter to avoid hard dependencies on optional ledger modules.
 * Priority: injected native reader -> compat JSON snapshot -> zeroed missing summary.
 */
export async function readLedgerSummarySafe(args: { days: number }): Promise<Summary> {
  const native = await readNativeSummary(args);
  if (native) return native;

  const compat = readCompatSnapshot();
  if (compat) return compat;

  return {
    source: "missing",
    inferredUsdSpend: 0,
    realizedFeesUsd: 0,
    microRetireUsd: 0,
  };
}

async function readNativeSummary(args: { days: number }): Promise<Summary | null> {
  const reader = globalThis.__NETNET_LEDGER_SUMMARY_READER__;
  if (typeof reader !== "function") return null;
  try {
    const value = await reader(args);
    return { source: "native", ...normalize(value) };
  } catch {
    return null;
  }
}

function readCompatSnapshot(): Summary | null {
  for (const snapshotPath of COMPAT_SNAPSHOT_PATHS) {
    try {
      if (!fs.existsSync(snapshotPath)) continue;
      const raw = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as unknown;
      return { source: "compat", ...normalize(raw) };
    } catch {
      continue;
    }
  }
  return null;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalize(value: unknown) {
  const record = toRecord(value);
  return {
    inferredUsdSpend: toFiniteNumber(
      record.inferredUsdSpend ?? record.inferenceUsd ?? record.inferenceSpendUsd
    ),
    realizedFeesUsd: toFiniteNumber(
      record.realizedFeesUsd ?? record.feesUsd ?? record.realizedUsd
    ),
    microRetireUsd: toFiniteNumber(
      record.microRetireUsd ?? record.microRetireIntentUsd ?? record.retireUsd
    ),
  };
}
