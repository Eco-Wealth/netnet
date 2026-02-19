import { headers } from "next/headers";

export type BankrBalance = {
  chain: string;
  symbol: string;
  amount: string;
  usd?: number;
};

export type BankrPosition = {
  chain: string;
  venue?: string;
  pair?: string;
  side?: "LONG" | "SHORT" | "LP" | "SPOT" | string;
  size?: string;
  entryUsd?: number;
  markUsd?: number;
  pnlUsd?: number;
  meta?: Record<string, unknown>;
};

export type BankrHistoryItem = {
  ts: string; // ISO
  chain: string;
  type: string; // transfer|swap|lp|fee|other
  summary: string;
  txHash?: string;
  meta?: Record<string, unknown>;
};

type FetchOpts = {
  wallet?: string;
  action: "balances" | "positions" | "history" | "state";
  limit?: number;
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length ? v.trim() : undefined;
}

function isMockEnabled(): boolean {
  return env("BANKR_WALLET_MOCK") === "1";
}

function baseUrl(): string | undefined {
  return env("BANKR_WALLET_API_BASE_URL");
}

function apiKey(): string | undefined {
  return env("BANKR_WALLET_API_KEY");
}

function defaultWallet(): string | undefined {
  return env("BANKR_WALLET_ADDRESS");
}

function clientIdFromReq(): string {
  const h = headers();
  return h.get("x-request-id") || h.get("x-vercel-id") || `local-${Date.now()}`;
}

function mockResponse(action: FetchOpts["action"]) {
  const now = new Date().toISOString();
  if (action === "balances" || action === "state") {
    return {
      balances: [
        { chain: "base", symbol: "USDC", amount: "125.34", usd: 125.34 },
        { chain: "base", symbol: "ETH", amount: "0.0412", usd: 127.88 },
        { chain: "base", symbol: "ECO", amount: "1500000", usd: 18.2 },
      ] satisfies BankrBalance[],
    };
  }
  if (action === "positions") {
    return {
      positions: [
        {
          chain: "base",
          venue: "uniswap-v4",
          pair: "ECO/USDC",
          side: "LP",
          size: "full-range",
          meta: { feeTier: "1%", tvlUsd: 220 },
        },
      ] satisfies BankrPosition[],
    };
  }
  return {
    history: [
      {
        ts: now,
        chain: "base",
        type: "fee",
        summary: "Collected fees from ECO/USDC LP",
        txHash: "0xMOCK",
      },
      {
        ts: now,
        chain: "base",
        type: "swap",
        summary: "Paper: planned swap USDC→ECO (not executed)",
      },
    ] satisfies BankrHistoryItem[],
  };
}

export async function fetchBankrWallet(opts: FetchOpts): Promise<
  | {
      ok: true;
      requestId: string;
      wallet: string;
      balances?: BankrBalance[];
      positions?: BankrPosition[];
      history?: BankrHistoryItem[];
      note?: string;
    }
  | {
      ok: false;
      requestId: string;
      wallet?: string;
      error: { code: string; message: string; details?: unknown };
    }
> {
  const requestId = clientIdFromReq();
  const wallet = (opts.wallet || defaultWallet() || "").trim();

  if (!wallet) {
    return {
      ok: false,
      requestId,
      error: {
        code: "MISSING_WALLET",
        message: "No wallet provided. Set BANKR_WALLET_ADDRESS or pass ?wallet=",
      },
    };
  }

  if (isMockEnabled() || !baseUrl()) {
    const mock = mockResponse(opts.action);
    return {
      ok: true,
      requestId,
      wallet,
      ...mock,
      note: !baseUrl()
        ? "BANKR_WALLET_API_BASE_URL not set; returning mock data."
        : "BANKR_WALLET_MOCK=1; returning mock data.",
    };
  }

  const url = new URL(baseUrl()!);
  url.pathname = url.pathname.replace(/\/$/, "") + "/wallet";
  url.searchParams.set("action", opts.action);
  url.searchParams.set("wallet", wallet);
  if (opts.limit) url.searchParams.set("limit", String(opts.limit));

  let r: Response;
  try {
    r = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(apiKey() ? { authorization: `Bearer ${apiKey()}` } : {}),
        "x-request-id": requestId,
      },
      cache: "no-store",
    });
  } catch (e: any) {
    return {
      ok: false,
      requestId,
      wallet,
      error: { code: "FETCH_FAILED", message: "Failed to reach BANKR wallet API.", details: String(e) },
    };
  }

  const text = await r.text();
  let data: any = undefined;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // ignore
  }

  if (!r.ok) {
    return {
      ok: false,
      requestId,
      wallet,
      error: { code: "UPSTREAM_ERROR", message: `Upstream BANKR wallet API returned ${r.status}`, details: data || text },
    };
  }

  const payload = data?.data ?? data ?? {};
  return {
    ok: true,
    requestId,
    wallet,
    balances: payload.balances,
    positions: payload.positions,
    history: payload.history,
    note: payload.note,
  };
}
