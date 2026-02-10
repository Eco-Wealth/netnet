import { getServerBaseUrl } from "@/lib/server/baseUrl";

async function getAudit() {
  const base = getServerBaseUrl();
  const res = await fetch(`${base}/api/security/audit`, { cache: "no-store" });
  return res.json();
}

export default async function SecurityPage() {
  const data = await getAudit().catch((e) => ({ ok: false, error: String(e) }));
  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <div className="mb-3">
        <div className="text-lg font-semibold">Security</div>
        <div className="text-sm opacity-70">Configuration self-audit (no secrets).</div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <pre className="overflow-auto text-xs leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </main>
  );
}
