export type AutonomyLevel = "READ_ONLY" | "PROPOSE_ONLY" | "EXECUTE_WITH_LIMITS";

export type Policy = {
  autonomy: AutonomyLevel;

  // Spend controls (USD unless otherwise stated)
  maxUsdPerDay: number;
  maxUsdPerAction: number;

  // Allow-lists: keep tight; expand intentionally.
  allowlistTokens: string[];
  allowlistVenues: string[];
  allowlistChains: string[];

  // Kill switches
  kill: {
    all: boolean; // hard stop everything
    trading: boolean;
    tokenOps: boolean;
    retirements: boolean;
  };

  // Notes for operator / audit
  updatedAt: string; // ISO
  updatedBy: string; // freeform (operator name/handle)
};

const DEFAULT_POLICY: Policy = {
  autonomy: "PROPOSE_ONLY",
  maxUsdPerDay: 25,
  maxUsdPerAction: 10,
  allowlistTokens: ["USDC", "ETH", "REGEN", "K2", "KVCM", "ECOWEALTH"],
  allowlistVenues: ["uniswap", "aerodrome", "bankr", "bridge-eco"],
  allowlistChains: ["base"],
  kill: { all: false, trading: false, tokenOps: false, retirements: false },
  updatedAt: new Date(0).toISOString(),
  updatedBy: "system",
};

// In-memory store for now (dev-friendly). Replace with DB later.
// eslint-disable-next-line no-var
declare global {
  // eslint-disable-next-line no-var
  var __NETNET_POLICY__: Policy | undefined;
}

export function getPolicy(): Policy {
  if (!globalThis.__NETNET_POLICY__) globalThis.__NETNET_POLICY__ = DEFAULT_POLICY;
  return globalThis.__NETNET_POLICY__!;
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function setPolicy(next: Policy): Policy {
  const current = getPolicy();

  const normalized: Policy = {
    autonomy: (next.autonomy ?? current.autonomy) as Policy["autonomy"],
    maxUsdPerDay: clamp(Number(next.maxUsdPerDay ?? current.maxUsdPerDay), 0, 1_000_000),
    maxUsdPerAction: clamp(Number(next.maxUsdPerAction ?? current.maxUsdPerAction), 0, 1_000_000),
    allowlistTokens: Array.isArray(next.allowlistTokens) ? next.allowlistTokens.map(String) : current.allowlistTokens,
    allowlistVenues: Array.isArray(next.allowlistVenues) ? next.allowlistVenues.map(String) : current.allowlistVenues,
    allowlistChains: Array.isArray(next.allowlistChains) ? next.allowlistChains.map(String) : current.allowlistChains,
    kill: {
      all: Boolean((next as any)?.kill?.all ?? current.kill.all),
      trading: Boolean((next as any)?.kill?.trading ?? current.kill.trading),
      tokenOps: Boolean((next as any)?.kill?.tokenOps ?? current.kill.tokenOps),
      retirements: Boolean((next as any)?.kill?.retirements ?? current.kill.retirements),
    },
    updatedAt: new Date().toISOString(),
    updatedBy: String(next.updatedBy ?? current.updatedBy ?? "operator"),
  };

  globalThis.__NETNET_POLICY__ = normalized;
  return normalized;
}
