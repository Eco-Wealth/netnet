import { getServerBaseUrl } from "@/lib/server/baseUrl";

async function getJSON(path: string) {
  const base = getServerBaseUrl();
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  return res.json();
}

export default async function TokenDashboardPage() {
  const [info, actions] = await Promise.all([
    getJSON("/api/bankr/token/info").catch((e) => ({ ok: false, error: String(e) })),
    getJSON("/api/bankr/token/actions").catch((e) => ({ ok: false, error: String(e) })),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <div className="mb-3">
        <div className="text-lg font-semibold">Token</div>
        <div className="text-sm opacity-70">Bankr token operations (proposal-first).</div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 text-sm font-medium">Info</div>
          <pre className="overflow-auto text-xs leading-relaxed">
            {JSON.stringify(info, null, 2)}
          </pre>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 text-sm font-medium">Actions</div>
          <pre className="overflow-auto text-xs leading-relaxed">
            {JSON.stringify(actions, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}
