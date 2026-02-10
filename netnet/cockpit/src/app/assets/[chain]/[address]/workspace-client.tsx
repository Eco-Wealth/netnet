"use client";

import { useEffect, useMemo, useState } from "react";

type Json = any;

function Section({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-white/60">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function CodeBlock({ value }: { value: any }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <pre className="max-h-[360px] overflow-auto rounded-xl bg-black/30 p-3 text-xs leading-relaxed text-white/80">
      {text}
    </pre>
  );
}

async function getJSON(url: string): Promise<Json> {
  const r = await fetch(url, { cache: "no-store" });
  const ct = r.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await r.json() : await r.text();
  if (!r.ok) {
    const err: any = new Error(`HTTP ${r.status}`);
    err.status = r.status;
    err.body = body;
    throw err;
  }
  return body;
}

function pill(status: "idle" | "ok" | "err") {
  const base = "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium border";
  if (status === "ok")
    return <span className={`${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-200`}>OK</span>;
  if (status === "err")
    return <span className={`${base} border-rose-500/30 bg-rose-500/10 text-rose-200`}>ERR</span>;
  return <span className={`${base} border-white/10 bg-white/5 text-white/70`}>…</span>;
}

export default function AssetWorkspaceClient({ chain, address }: { chain: string; address: string }) {
  const [scan, setScan] = useState<Json | null>(null);
  const [scanErr, setScanErr] = useState<any>(null);
  const [health, setHealth] = useState<Json | null>(null);
  const [healthErr, setHealthErr] = useState<any>(null);
  const [tradeInfo, setTradeInfo] = useState<Json | null>(null);
  const [tradeErr, setTradeErr] = useState<any>(null);
  const [carbonInfo, setCarbonInfo] = useState<Json | null>(null);
  const [carbonErr, setCarbonErr] = useState<any>(null);

  const [workItem, setWorkItem] = useState<Json | null>(null);
  const [workErr, setWorkErr] = useState<any>(null);

  const assetKey = useMemo(() => `${chain}:${address}`, [chain, address]);

  useEffect(() => {
    getJSON("/api/health").then(setHealth).catch(setHealthErr);
    getJSON("/api/agent/trade?action=info").then(setTradeInfo).catch(setTradeErr);
    getJSON("/api/agent/carbon?action=info").then(setCarbonInfo).catch(setCarbonErr);
  }, []);

  async function runScan() {
    setScanErr(null);
    setScan(null);
    try {
      const q = new URLSearchParams({ chain, address });
      const data = await getJSON(`/api/ecotoken/scan?${q.toString()}`);
      setScan(data);
    } catch (e: any) {
      setScanErr(e);
    }
  }

  async function createWorkItem() {
    setWorkErr(null);
    setWorkItem(null);
    try {
      const r = await fetch("/api/work/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: `Asset workspace: ${assetKey}`,
          kind: "ASSET",
          asset: { chain, address },
          status: "PROPOSED",
          notes: "Created from Asset Workspace. Operator review required before any execution.",
        }),
      });
      const ct = r.headers.get("content-type") || "";
      const body = ct.includes("application/json") ? await r.json() : await r.text();
      if (!r.ok) {
        const err: any = new Error(`HTTP ${r.status}`);
        err.status = r.status;
        err.body = body;
        throw err;
      }
      setWorkItem(body);
    } catch (e: any) {
      setWorkErr(e);
    }
  }

  const scanStatus: "idle" | "ok" | "err" = scan ? "ok" : scanErr ? "err" : "idle";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-2">
        <div className="text-xs text-white/60">Asset Workspace</div>
        <div className="text-2xl font-semibold tracking-tight">{chain}</div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white/80">
          {address || "(missing address)"}
        </div>
        <div className="mt-1 text-sm text-white/60">
          Inner loop: scan → propose → approve → execute (optional) → proof + accounting.
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Section
          title="Service health"
          subtitle="Fast signal that the cockpit is responding"
          right={pill(health ? "ok" : healthErr ? "err" : "idle")}
        >
          {health ? (
            <CodeBlock value={health} />
          ) : healthErr ? (
            <CodeBlock value={{ error: String(healthErr?.message || healthErr), details: healthErr?.body }} />
          ) : (
            <div className="text-sm text-white/60">Loading…</div>
          )}
        </Section>

        <Section
          title="ecoToken scan links"
          subtitle="Generates verification links for a token/contract"
          right={pill(scanStatus)}
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runScan}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              title="Fetch /api/ecotoken/scan for this chain + address"
            >
              Run scan
            </button>
            <button
              onClick={createWorkItem}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              title="Create a proposed work item tied to this asset"
            >
              Create work item
            </button>
          </div>

          <div className="mt-4">
            {scan ? (
              <CodeBlock value={scan} />
            ) : scanErr ? (
              <CodeBlock value={{ error: String(scanErr?.message || scanErr), details: scanErr?.body }} />
            ) : (
              <div className="text-sm text-white/60">No scan run yet.</div>
            )}
          </div>

          <div className="mt-3">
            {workItem ? (
              <CodeBlock value={workItem} />
            ) : workErr ? (
              <CodeBlock value={{ error: String(workErr?.message || workErr), details: workErr?.body }} />
            ) : null}
          </div>
        </Section>

        <Section
          title="Trade policy & planning (read-only)"
          subtitle="Safe-by-default. Execution remains gated."
          right={pill(tradeInfo ? "ok" : tradeErr ? "err" : "idle")}
        >
          {tradeInfo ? (
            <CodeBlock value={tradeInfo} />
          ) : tradeErr ? (
            <CodeBlock value={{ error: String(tradeErr?.message || tradeErr), details: tradeErr?.body }} />
          ) : (
            <div className="text-sm text-white/60">Loading…</div>
          )}
        </Section>

        <Section
          title="Carbon retirement agent surface (read-only)"
          subtitle="Info + nextAction for an operator-guided flow"
          right={pill(carbonInfo ? "ok" : carbonErr ? "err" : "idle")}
        >
          {carbonInfo ? (
            <CodeBlock value={carbonInfo} />
          ) : carbonErr ? (
            <CodeBlock value={{ error: String(carbonErr?.message || carbonErr), details: carbonErr?.body }} />
          ) : (
            <div className="text-sm text-white/60">Loading…</div>
          )}
        </Section>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
        <div className="text-base font-semibold">Suggested next actions</div>
        <div className="mt-2 text-sm text-white/70">
          1) Run scan to generate shareable verification links. 2) Create a work item so the asset is tracked in the queue.
          3) Use Strategy Presets to propose trades/ops under caps.
        </div>
      </div>
    </div>
  );
}
