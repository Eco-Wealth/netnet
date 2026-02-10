import { getServerBaseUrl } from "@/lib/server/baseUrl";

async function getReport() {
  const base = getServerBaseUrl();
  const res = await fetch(`${base}/api/agent/revenue?action=report&days=7`, {
    cache: "no-store",
  });
  return res.json();
}

export default async function RevenuePage() {
  const data = await getReport().catch((e) => ({ ok: false, error: String(e) }));
  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <div className="mb-3">
        <div className="text-lg font-semibold">Revenue</div>
        <div className="text-sm opacity-70">Read-only rollups for the operator loop.</div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <pre className="overflow-auto text-xs leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </main>
  );
}
