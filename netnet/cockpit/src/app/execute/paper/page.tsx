"use client";

import { useMemo, useState } from "react";

type ApiResp = any;

function pretty(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export default function PaperTradePage() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [tokenIn, setTokenIn] = useState("USDC");
  const [tokenOut, setTokenOut] = useState("ETH");
  const [amountUsd, setAmountUsd] = useState("10");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [reason, setReason] = useState("");
  const [resp, setResp] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);

  const amountNum = useMemo(() => Number(amountUsd || "0"), [amountUsd]);

  async function onQuote() {
    setLoading(true);
    setResp(null);
    try {
      const qs = new URLSearchParams({
        action: "quote",
        side,
        tokenIn,
        tokenOut,
        amountUsd: String(amountNum),
      });
      const r = await fetch(`/api/agent/trade?${qs.toString()}`);
      const j = await r.json();
      setResp({ status: r.status, body: j });
    } catch (e: any) {
      setResp({ status: "client_error", body: { ok: false, error: { code: "client_error", message: e?.message ?? String(e) } } });
    } finally {
      setLoading(false);
    }
  }

  async function onPlan() {
    setLoading(true);
    setResp(null);
    try {
      const r = await fetch(`/api/agent/trade`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          beneficiaryName,
          reason,
          side,
          tokenIn,
          tokenOut,
          amountUsd: amountNum,
          dryRun: true,
          slippageBps: 50,
        }),
      });
      const j = await r.json();
      setResp({ status: r.status, body: j });
    } catch (e: any) {
      setResp({ status: "client_error", body: { ok: false, error: { code: "client_error", message: e?.message ?? String(e) } } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Paper trade (safe stub)</h1>
      <p className="mt-2 text-sm text-neutral-400">
        This module returns simulated quotes and an execution plan. It does <span className="font-semibold">not</span> broadcast transactions.
        Trading stays disabled by default.
      </p>

      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="mb-1 text-neutral-400">Side</div>
            <select className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2" value={side} onChange={(e) => setSide(e.target.value as any)}>
              <option value="buy">buy</option>
              <option value="sell">sell</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1 text-neutral-400">Amount (USD)</div>
            <input className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} inputMode="decimal" />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-neutral-400">Token in</div>
            <input className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2" value={tokenIn} onChange={(e) => setTokenIn(e.target.value)} />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-neutral-400">Token out</div>
            <input className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2" value={tokenOut} onChange={(e) => setTokenOut(e.target.value)} />
          </label>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            <div className="mb-1 text-neutral-400">Beneficiary name (required)</div>
            <input className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="e.g., EcoWealth Corp" />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-neutral-400">Reason (required)</div>
            <input className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this trade being considered?" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onQuote}
            disabled={loading}
            className="rounded-xl border border-neutral-800 bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            Simulate quote
          </button>
          <button
            onClick={onPlan}
            disabled={loading || !beneficiaryName.trim() || !reason.trim()}
            className="rounded-xl border border-neutral-800 bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Build execution plan (DRY_RUN)
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-800 bg-black p-3 text-xs text-neutral-200">
          <div className="mb-2 font-semibold text-neutral-300">Risk warnings</div>
          <ul className="list-disc space-y-1 pl-5 text-neutral-400">
            <li>Trading is optional tooling. There are no profit guarantees.</li>
            <li>Funds movement is not implemented in this unit.</li>
            <li>Caps and allowlists are enforced server-side.</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
        <div className="mb-2 text-sm font-semibold text-neutral-200">Response</div>
        <pre className="overflow-auto rounded-xl border border-neutral-800 bg-black p-3 text-xs text-neutral-200">
          {resp ? pretty(resp) : "No response yet."}
        </pre>
        <p className="mt-2 text-xs text-neutral-500">
          Endpoint: <code className="text-neutral-300">/api/agent/trade</code>
        </p>
      </div>
    </div>
  );
}
