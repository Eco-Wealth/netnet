"use client";

import * as React from "react";

type Tab = "balances" | "positions" | "history";

function fmtUsd(n?: number) {
  if (n === undefined || n === null) return "";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
}

export function WalletStatePanel() {
  const [tab, setTab] = React.useState<Tab>("balances");
  const [wallet, setWallet] = React.useState<string>("");
  const [data, setData] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  async function load(nextTab: Tab) {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ action: nextTab });
      if (wallet.trim()) qs.set("wallet", wallet.trim());
      const res = await fetch(`/api/bankr/wallet?${qs.toString()}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error?.message || `Request failed (${res.status})`);
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "Failed to load wallet state");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const tabs: { id: Tab; label: string; hint: string }[] = [
    { id: "balances", label: "Balances", hint: "Read-only balances by chain + symbol." },
    { id: "positions", label: "Positions", hint: "Read-only positions (LP / spot / perps if available)." },
    { id: "history", label: "History", hint: "Recent activity and receipts (tx hashes if available)." },
  ];

  return (
    <div className="nn-page-stack">
      <div className="nn-surface">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1>Wallet</h1>
            <p className="nn-page-lead">Read-only state surfaces for Bankr-connected agents.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="optional: wallet address"
              className="w-[260px] rounded-[11px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
            />
            <button
              onClick={() => load(tab)}
              className="rounded-[11px] border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white hover:bg-white/[0.12]"
              title="Reload the selected tab"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.hint}
              className={[
                "rounded-xl border px-3 py-1.5 text-sm transition",
                tab === t.id
                  ? "border-sky-300/40 bg-sky-500/20 text-white"
                  : "border-white/15 bg-white/[0.04] text-white/90 hover:bg-white/[0.09]",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-[14px] border border-white/15 bg-white/[0.03] p-4">
          {loading && <p className="text-sm text-white/75">Loading...</p>}
          {err && <p className="text-sm text-red-300">{err}</p>}

          {!loading && !err && data?.ok && (
            <>
              {tab === "balances" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-white/70">
                      <tr>
                        <th className="py-2">Chain</th>
                        <th>Symbol</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.balances || []).map((b: any, i: number) => (
                        <tr key={i} className="border-t border-white/10">
                          <td className="py-2">{b.chain}</td>
                          <td>{b.symbol}</td>
                          <td className="text-right">{b.amount}</td>
                          <td className="text-right">{fmtUsd(b.usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.note && <p className="mt-3 text-xs text-white/60">{data.note}</p>}
                </div>
              )}

              {tab === "positions" && (
                <div className="space-y-3">
                  {(data.positions || []).length === 0 && <p className="text-sm text-white/75">No positions returned.</p>}
                  {(data.positions || []).map((p: any, i: number) => (
                    <div key={i} className="rounded-[11px] border border-white/15 p-3 hover:bg-white/[0.05]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">
                          {p.pair || "Position"} <span className="text-white/60">({p.chain})</span>
                        </div>
                        <div className="text-xs text-white/70">
                          {p.venue ? `${p.venue} · ` : ""}
                          {p.side || "N/A"}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <div>
                          <div className="text-xs text-white/60">Size</div>
                          <div>{p.size || "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/60">Entry</div>
                          <div>{fmtUsd(p.entryUsd) || "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/60">Mark</div>
                          <div>{fmtUsd(p.markUsd) || "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/60">PnL</div>
                          <div>{fmtUsd(p.pnlUsd) || "—"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.note && <p className="text-xs text-white/60">{data.note}</p>}
                </div>
              )}

              {tab === "history" && (
                <div className="space-y-2">
                  {(data.history || []).length === 0 && <p className="text-sm text-white/75">No history returned.</p>}
                  {(data.history || []).map((h: any, i: number) => (
                    <div key={i} className="rounded-[11px] border border-white/15 p-3 hover:bg-white/[0.05]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium">{h.summary}</div>
                        <div className="text-xs text-white/70">
                          {h.type} · {h.chain}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        {h.ts}
                        {h.txHash ? ` · tx: ${h.txHash}` : ""}
                      </div>
                    </div>
                  ))}
                  {data.note && <p className="text-xs text-white/60">{data.note}</p>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-4 rounded-[14px] border border-white/15 bg-white/[0.04] p-3 text-xs text-white/85">
          <div className="font-medium">API</div>
          <div className="mt-1 font-mono">
            GET /api/bankr/wallet?action=balances|positions|history|state&amp;wallet=...
          </div>
          <div className="mt-2 text-white/65">
            Defaults to mock data unless <span className="font-mono">BANKR_WALLET_API_BASE_URL</span> is set (or set{" "}
            <span className="font-mono">BANKR_WALLET_MOCK=1</span>).
          </div>
        </div>
      </div>
    </div>
  );
}
