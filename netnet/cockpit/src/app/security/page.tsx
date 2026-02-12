import Link from "next/link";
import { headers } from "next/headers";

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function getAudit(baseUrl: string) {
  const res = await fetch(`${baseUrl}/api/security/audit`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return null;
  return res.json();
}

export default async function SecurityPage() {
  const data = await getAudit(getBaseUrl());
  const audit = data?.audit;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Security</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link className="underline opacity-80 hover:opacity-100" href="/proof">Proof</Link>
          <span className="opacity-40">/</span>
          <Link className="underline opacity-80 hover:opacity-100" href="/execute">Execute</Link>
          <span className="opacity-40">/</span>
          <Link className="underline opacity-80 hover:opacity-100" href="/retire">Retire</Link>
        </div>
      </div>

      <p className="mt-2 text-sm opacity-80">
        Read-only self-audit for configuration + guardrails. Does not reveal secrets.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-80">Status</div>
          <div className="text-sm font-medium">
            {audit ? (audit.ok ? "OK" : "Needs attention") : "Unavailable"}
          </div>
        </div>

        {audit && (
          <>
            <div className="mt-3 flex flex-wrap gap-3 text-xs opacity-80">
              <span className="rounded-full border border-white/10 px-2 py-1">pass: {audit.summary.pass}</span>
              <span className="rounded-full border border-white/10 px-2 py-1">warn: {audit.summary.warn}</span>
              <span className="rounded-full border border-white/10 px-2 py-1">fail: {audit.summary.fail}</span>
              <span className="rounded-full border border-white/10 px-2 py-1">total: {audit.summary.total}</span>
            </div>

            <div className="mt-5 space-y-3">
              {audit.checks.map((c: any) => (
                <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{c.label}</div>
                      {c.detail && <div className="mt-1 text-xs opacity-70">{c.detail}</div>}
                    </div>
                    <span
                      className={
                        "rounded-full px-2 py-1 text-xs border " +
                        (c.status === "pass"
                          ? "border-emerald-400/30 text-emerald-200"
                          : c.status === "warn"
                          ? "border-amber-400/30 text-amber-200"
                          : "border-rose-400/30 text-rose-200")
                      }
                      title="Check result"
                    >
                      {c.status}
                    </span>
                  </div>
                  {c.remediation && (
                    <div className="mt-3 text-xs opacity-80">
                      <span className="opacity-60">Remediation: </span>
                      {c.remediation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!audit && (
          <div className="mt-4 text-xs opacity-80">
            Start the dev server, then refresh. You can also hit{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">/api/security/audit</code>.
          </div>
        )}
      </div>

      <div className="mt-8 text-xs opacity-70">
        Tip: keep autonomy at PROPOSE_ONLY until caps + allowlists + kill-switch wiring are proven.
      </div>
    </main>
  );
}
