"use client";

import { useMemo, useState } from "react";
import { withWork, appendWorkEvent } from "@/lib/work/client";
import { useWorkSession } from "./useWorkSession";

type ApiResult = { ok: boolean; [k: string]: any };

async function getJson(url: string): Promise<ApiResult> {
  const res = await fetch(url, { cache: "no-store" });
  return (await res.json()) as ApiResult;
}

export default function Workbench() {
  const { workId, setWorkId } = useWorkSession();
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const actions = useMemo(
    () => [
      { key: "health", label: "Ping /api/health", url: "/api/health", kind: "OPS" as const },
      { key: "proofPaid", label: "Check /api/proof-paid (x402)", url: "/api/proof-paid", kind: "PROOF" as const },
      { key: "carbonInfo", label: "Agent Carbon info", url: "/api/agent/carbon?action=info", kind: "CARBON_RETIRE" as const },
      { key: "tradeInfo", label: "Agent Trade info", url: "/api/agent/trade?action=info", kind: "TRADE_PLAN" as const },
      { key: "bridgeRegistry", label: "Bridge Registry", url: "/api/bridge/registry", kind: "CARBON_RETIRE" as const },
    ],
    []
  );

  async function run(action: (typeof actions)[number]) {
    setBusy(true);
    setOut(null);
    try {
      const { workId: created, result } = await withWork(
        { title: action.label, kind: action.kind, tags: ["workbench"] },
        async (wid) => {
          if (wid) await appendWorkEvent(wid, { type: "INFO", message: "Calling endpoint", data: { url: action.url } });
          return await getJson(action.url);
        }
      );
      if (created) setWorkId(created);
      setOut({ workId: created, result });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Workbench</h1>
        <div className="text-sm opacity-80">
          Current work:{" "}
          <span className="font-mono">{workId || "none"}</span>
          {workId ? (
            <button className="ml-3 underline" onClick={() => setWorkId(null)}>
              clear
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-sm opacity-80">
        This page demonstrates Unit 41: every action can create a Work item and append events via the Work API.
      </p>

      <div className="mt-5 grid gap-2">
        {actions.map((a) => (
          <button
            key={a.key}
            disabled={busy}
            onClick={() => run(a)}
            className="rounded-xl border px-4 py-3 text-left hover:bg-black/5 disabled:opacity-50"
          >
            <div className="font-medium">{a.label}</div>
            <div className="mt-1 font-mono text-xs opacity-70">{a.url}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border p-4">
        <div className="text-sm font-medium">Output</div>
        <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg bg-black/5 p-3 text-xs">
          {out ? JSON.stringify(out, null, 2) : busy ? "Running..." : "—"}
        </pre>
      </div>
    </div>
  );
}
