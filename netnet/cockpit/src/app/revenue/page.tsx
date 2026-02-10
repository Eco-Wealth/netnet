import Link from "next/link";

async function getReport() {
  const res = await fetch("http://localhost:3000/api/agent/revenue?action=report&days=7", { cache: "no-store" });
  return res.json();
}

export default async function RevenuePage() {
  // Server component: in dev, localhost fetch works; in production, baseUrl helper should be used.
  // If this fails, UI still renders with a fallback.
  let report: any = null;
  try {
    report = await getReport();
  } catch {
    report = null;
  }

  const totals = report?.totals || {};
  const fmt = (v: any) => (typeof v === "number" ? v.toFixed(2) : "—");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>
        <div className="flex gap-2 text-sm">
          <Link className="rounded-md border px-3 py-1 hover:bg-white/5" href="/proof">Proof</Link>
          <Link className="rounded-md border px-3 py-1 hover:bg-white/5" href="/execute">Execute</Link>
          <Link className="rounded-md border px-3 py-1 hover:bg-white/5" href="/retire">Retire</Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-white/70">
        Read-only rollups for fees, inference costs, and micro-retire intent. Execution remains operator-gated.
      </p>

      <div className="mt-6 grid gap-3 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/70">Window</div>
          <div className="text-sm">{report?.windowDays ? `${report.windowDays} days` : "7 days"}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card label="Realized fees (USD)" value={fmt(totals.realizedFeesUsd)} />
          <Card label="Inference spend (USD)" value={fmt(totals.inferredUsdSpend)} />
          <Card label="Micro-retire intent (USD)" value={fmt(totals.microRetireUsd)} />
          <Card label="Net (USD)" value={fmt(totals.netUsd)} />
        </div>

        {Array.isArray(report?.notes) && report.notes.length > 0 && (
          <div className="mt-2 rounded-lg bg-white/5 p-3 text-sm text-white/80">
            <div className="font-medium">Notes</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {report.notes.map((n: string, i: number) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-2 text-xs text-white/60">
          API: <code className="rounded bg-black/30 px-1 py-0.5">/api/agent/revenue</code>{" "}
          • actions: <code className="rounded bg-black/30 px-1 py-0.5">info</code>,{" "}
          <code className="rounded bg-black/30 px-1 py-0.5">report</code>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/5 p-3">
      <div className="text-xs text-white/70">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
