"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";

type Initial = {
  bypassEnabled: boolean;
  payTo: string;
};

type ProbeResult = {
  ts: string;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  bodySnippet: string;
};

function headerOrEmpty(headers: Headers, name: string) {
  return headers.get(name) ?? "";
}

export default function PaywallDebugClient({ initial }: { initial: Initial }) {
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const payToLabel = useMemo(() => {
    if (!initial.payTo) return "(unset)";
    if (initial.payTo.length <= 14) return initial.payTo;
    return `${initial.payTo.slice(0, 6)}…${initial.payTo.slice(-6)}`;
  }, [initial.payTo]);

  async function probePaywall() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proof-paid", {
        method: "GET",
        cache: "no-store",
        headers: { "x-netnet-probe": "1" },
      });

      const text = await res.text();
      const hdrs: Record<string, string> = {
        "x402-pay-to": headerOrEmpty(res.headers, "x402-pay-to"),
        "www-authenticate": headerOrEmpty(res.headers, "www-authenticate"),
        "x402-challenge": headerOrEmpty(res.headers, "x402-challenge"),
        "x402-version": headerOrEmpty(res.headers, "x402-version"),
      };

      setProbe({
        ts: new Date().toISOString(),
        status: res.status,
        ok: res.ok,
        headers: hdrs,
        bodySnippet: text.slice(0, 400),
      });
    } catch (e: any) {
      setError(e?.message ?? "Unknown error probing paywall");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">Paywall Debug</div>
          <div className="text-xs opacity-70">Unit 3: x402 testability</div>
        </div>
        <Button
          onClick={probePaywall}
          disabled={loading}
          variant="ghost"
          size="sm"
          className="text-xs"
        >
          {loading ? "Probing…" : "Probe /api/proof-paid"}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <div className="flex items-center justify-between rounded-lg bg-black/5 px-2 py-1.5">
          <span className="opacity-70">X402_DEV_BYPASS</span>
          <span className={initial.bypassEnabled ? "font-medium" : ""}>
            {initial.bypassEnabled ? "true" : "false"}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-black/5 px-2 py-1.5">
          <span className="opacity-70">X402_PAY_TO</span>
          <span className="font-mono text-xs">{payToLabel}</span>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-2 text-xs">
          {error}
        </div>
      ) : null}

      {probe ? (
        <div className="mt-3 rounded-lg border p-2">
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-70">Last probe: {probe.ts}</div>
            <div className="font-mono text-xs">
              status={probe.status} ok={probe.ok ? "true" : "false"}
            </div>
          </div>

          <div className="mt-2 text-xs font-medium">Challenge headers</div>
          <pre className="mt-1 overflow-auto rounded-lg bg-black/5 p-2 text-[11px]">
{JSON.stringify(probe.headers, null, 2)}
          </pre>

          <div className="mt-2 text-xs font-medium">Body (first 400 chars)</div>
          <pre className="mt-1 overflow-auto rounded-lg bg-black/5 p-2 text-[11px]">
{probe.bodySnippet || "(empty)"}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
