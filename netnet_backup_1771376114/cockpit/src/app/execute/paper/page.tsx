"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";

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
    <div className="nn-page-stack">
      <PageHeader
        title="Execute / Paper"
        subtitle="Simulate trade quotes and dry-run plans."
        guidance="Set side, pair, and amount, then simulate quote or build a dry-run plan."
        outputs="Produces: quote/plan response JSON only. No live transaction broadcast."
      />

      <div className="nn-surface">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="mb-1 text-white/65">Side</div>
            <select className="w-full rounded-lg border border-white/14 bg-black/40 px-3 py-2" value={side} onChange={(e) => setSide(e.target.value as any)}>
              <option value="buy">buy</option>
              <option value="sell">sell</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1 text-white/65">Amount (USD)</div>
            <input className="w-full rounded-lg border border-white/14 bg-black/40 px-3 py-2" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} inputMode="decimal" />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-white/65">Token in</div>
            <input className="w-full rounded-lg border border-white/14 bg-black/40 px-3 py-2" value={tokenIn} onChange={(e) => setTokenIn(e.target.value)} />
          </label>

          <label className="text-sm">
            <div className="mb-1 text-white/65">Token out</div>
            <input className="w-full rounded-lg border border-white/14 bg-black/40 px-3 py-2" value={tokenOut} onChange={(e) => setTokenOut(e.target.value)} />
          </label>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            <div className="mb-1 text-white/65">Beneficiary name (required)</div>
            <input className="w-full rounded-lg border border-white/14 bg-black/40 px-3 py-2" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="e.g., EcoWealth Corp" />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-white/65">Reason (required)</div>
            <input className="w-full rounded-lg border border-white/14 bg-black/40 px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this trade being considered?" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onQuote}
            disabled={loading}
            className="rounded-xl border border-white/14 bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            Quote
          </button>
          <button
            onClick={onPlan}
            disabled={loading || !beneficiaryName.trim() || !reason.trim()}
            className="rounded-xl border border-white/14 bg-black/50 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Build Plan (Dry Run)
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/12 bg-black/40 p-3 text-xs text-white/80">
          <div className="mb-2 font-semibold text-white/90">Risk warnings</div>
          <ul className="list-disc space-y-1 pl-5 text-white/65">
            <li>Trading is optional tooling. There are no profit guarantees.</li>
            <li>Funds movement is not implemented in this unit.</li>
            <li>Caps and allowlists are enforced server-side.</li>
          </ul>
        </div>
      </div>

      <div className="nn-surface">
        <div className="mb-2 text-sm font-semibold text-white/90">Response</div>
        <pre className="overflow-auto rounded-xl border border-white/12 bg-black/40 p-3 text-xs text-white/85">
          {resp ? pretty(resp) : "No response yet."}
        </pre>
        <p className="mt-2 text-xs text-white/55">
          Endpoint: <code className="text-white/75">/api/agent/trade</code>
        </p>
      </div>
    </div>
  );
}
