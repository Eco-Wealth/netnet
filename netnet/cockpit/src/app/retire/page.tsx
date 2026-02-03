"use client";

import React from "react";
import { Button, Card, Input, Muted, Select } from "@/components/ui";

type Registry = {
  version?: string;
  lastUpdated?: string;
  projects?: Array<any>;
  supportedTokens?: Record<string, any>;
};

function pickDefaultChain(reg: Registry | null): string {
  const keys = reg?.supportedTokens ? Object.keys(reg.supportedTokens) : [];
  if (keys.includes("base")) return "base";
  if (keys.includes("ethereum")) return "ethereum";
  return keys[0] ?? "ethereum";
}

function tokensForChain(reg: Registry | null, chain: string): Array<any> {
  if (!reg?.supportedTokens) return [];
  const x = (reg.supportedTokens as any)[chain];
  return Array.isArray(x) ? x : [];
}

export default function RetirePage() {
  const [registry, setRegistry] = React.useState<Registry | null>(null);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<any | null>(null);

  const [chain, setChain] = React.useState("base");
  const [token, setToken] = React.useState("USDC");
  const [amount, setAmount] = React.useState("25");

  const [txHash, setTxHash] = React.useState("");
  const [txStatus, setTxStatus] = React.useState<any | null>(null);
  const [scanInfo, setScanInfo] = React.useState<any | null>(null);
  const [err, setErr] = React.useState<string>("");

  async function loadRegistry() {
    setErr("");
    const res = await fetch("/api/bridge/registry");
    if (!res.ok) {
      setErr(`Registry fetch failed: HTTP ${res.status}`);
      return;
    }
    const data = (await res.json()) as Registry;
    setRegistry(data);

    const defChain = pickDefaultChain(data);
    setChain(defChain);

    const toks = tokensForChain(data, defChain);
    const defTok = toks.find((t: any) => String(t?.symbol ?? "").toUpperCase() === "USDC")?.symbol ?? toks[0]?.symbol ?? "USDC";
    setToken(defTok);
  }

  async function checkTx() {
    setErr("");
    setTxStatus(null);
    setScanInfo(null);

    const clean = txHash.trim();
    if (!clean) return setErr("Paste a tx hash.");

    const res = await fetch(`/api/bridge/tx?hash=${encodeURIComponent(clean)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data?.error ?? `Tx lookup failed: HTTP ${res.status}`);
      return;
    }
    setTxStatus(data);

    const scanRes = await fetch(`/api/ecotoken/scan?hash=${encodeURIComponent(clean)}`);
    const scanData = await scanRes.json().catch(() => null);
    if (scanData) setScanInfo(scanData);
  }

  React.useEffect(() => {
    loadRegistry().catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const projects = (registry?.projects ?? []).filter((p: any) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p?.name ?? "").toLowerCase().includes(q) ||
      String(p?.location ?? "").toLowerCase().includes(q) ||
      String(p?.type ?? "").toLowerCase().includes(q) ||
      String(p?.registry ?? "").toLowerCase().includes(q)
    );
  });

  const chains = registry?.supportedTokens ? Object.keys(registry.supportedTokens) : [];
  const tokenList = tokensForChain(registry, chain);
  const deepLink =
    selected
      ? `https://bridge.eco/?tab=impact&project=${encodeURIComponent(String(selected?.id ?? ""))}&amount=${encodeURIComponent(amount)}&chain=${encodeURIComponent(chain)}&token=${encodeURIComponent(token)}`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Retire</div>
        <Muted>
          Use Bridge.eco (ecoBridge) to fund a project; then track the retirement lifecycle until <code>RETIRED</code> and capture <code>certificate_id</code>.
          Verify publicly via <a href="https://scan.ecotoken.earth" target="_blank" rel="noreferrer">scan.ecotoken.earth</a>.
        </Muted>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-200">{err}</div>
      ) : null}

      <Card title="0) Choose chain / token / amount">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-sm mb-1 text-neutral-300">Chain</div>
            <Select value={chain} onChange={(e) => setChain(e.target.value)}>
              {chains.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-sm mb-1 text-neutral-300">Token</div>
            <Select value={token} onChange={(e) => setToken(e.target.value)}>
              {tokenList.length ? tokenList.map((t: any) => (
                <option key={t?.symbol} value={t?.symbol}>{t?.symbol}</option>
              )) : <option value="USDC">USDC</option>}
            </Select>
          </div>
          <div>
            <div className="text-sm mb-1 text-neutral-300">Amount (in token units)</div>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        {deepLink ? (
          <div className="mt-3 text-sm text-neutral-300">
            Deep link:{" "}
            <a href={deepLink} target="_blank" rel="noreferrer">
              open Bridge.eco Impact widget
            </a>
          </div>
        ) : (
          <div className="mt-3">
            <Muted>Select a project below to generate a deep link.</Muted>
          </div>
        )}
      </Card>

      <Card title="1) Choose project">
        <div className="space-y-3">
          <Input
            placeholder="Search projects (name, location, type)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
            {projects.slice(0, 50).map((p: any) => {
              const active = selected?.id === p?.id;
              return (
                <button
                  key={p?.id}
                  onClick={() => setSelected(p)}
                  className={[
                    "w-full text-left rounded-2xl border px-4 py-3",
                    active
                      ? "border-neutral-700 bg-neutral-900/40"
                      : "border-neutral-900 bg-neutral-950/40 hover:bg-neutral-900/20",
                  ].join(" ")}
                >
                  <div className="font-medium">{p?.name}</div>
                  <div className="text-sm text-neutral-400">
                    {p?.type} • {p?.location} • {p?.registry}
                  </div>
                </button>
              );
            })}
            {projects.length === 0 ? <Muted>No projects found.</Muted> : null}
          </div>
          <div className="text-xs text-neutral-500">
            Source: <a href="https://api.bridge.eco/registry" target="_blank" rel="noreferrer">api.bridge.eco/registry</a>
          </div>
        </div>
      </Card>

      <Card title="2) Send payment">
        {!selected ? (
          <Muted>Select a project above.</Muted>
        ) : (
          <div className="space-y-3">
            <Muted>
              Send {amount} {token} on <span className="font-mono">{chain}</span> to this project wallet, then paste the tx hash below.
            </Muted>
            <div className="rounded-xl border border-neutral-900 bg-black/30 p-3">
              <div className="text-xs text-neutral-400 mb-1">EVM wallet</div>
              <div className="font-mono text-sm break-all">{selected?.evmWallet ?? "(missing)"}</div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (selected?.evmWallet) navigator.clipboard.writeText(String(selected.evmWallet));
                }}
                disabled={!selected?.evmWallet}
              >
                Copy wallet
              </Button>
              {deepLink ? (
                <Button
                  className="bg-neutral-800 text-white hover:bg-neutral-700"
                  onClick={() => window.open(deepLink, "_blank")}
                >
                  Open widget
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      <Card title="3) Track status → certificate → verify">
        <div className="space-y-3">
          <Input
            placeholder="Paste transaction hash (0x...)"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={checkTx}>Check status</Button>
            <Button
              className="bg-neutral-800 text-white hover:bg-neutral-700"
              onClick={() => {
                const h = txHash.trim();
                if (h) navigator.clipboard.writeText(h);
              }}
              disabled={!txHash.trim()}
            >
              Copy tx hash
            </Button>
          </div>

          {txStatus ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-neutral-900 bg-black/30 p-3 text-sm">
                <div>Status: <span className="font-semibold">{txStatus?.status ?? "?"}</span></div>
                <div>USD value: {txStatus?.usd_value ?? "?"}</div>
                <div>Credits: {txStatus?.credits_amount ?? "?"}</div>
                <div>Certificate: <span className="font-mono">{txStatus?.certificate_id ?? "(pending)"}</span></div>
              </div>

              {scanInfo ? (
                <div className="rounded-xl border border-neutral-900 bg-neutral-950/40 p-3 text-sm">
                  <div className="font-medium">Public verification (ecoToken scan)</div>
                  <div className="text-neutral-400">{scanInfo?.instruction}</div>
                  <div className="mt-2">
                    <a href={scanInfo?.scanUrl} target="_blank" rel="noreferrer">
                      Open scan.ecotoken.earth
                    </a>
                  </div>
                </div>
              ) : null}

              {Array.isArray(txStatus?.timeline) ? (
                <div className="space-y-2">
                  <div className="text-sm text-neutral-300">Timeline</div>
                  <div className="space-y-2">
                    {txStatus.timeline.map((t: any, idx: number) => (
                      <div key={idx} className="rounded-xl border border-neutral-900 bg-neutral-950/40 px-3 py-2 text-xs">
                        <div className="font-mono">{t?.step}</div>
                        <div className="text-neutral-400">{t?.status}</div>
                        <div className="text-neutral-500">{t?.timestamp}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Muted>Bridge.eco reports a lifecycle: PENDING → DETECTED → CONVERTED → CALCULATED → RETIRED.</Muted>
          )}
        </div>
      </Card>
    </div>
  );
}
