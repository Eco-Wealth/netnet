import Link from "next/link";
import { headers } from "next/headers";
import PageHeader from "@/components/PageHeader";

async function getJSON(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: { message: text } }; }
}

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function TokenDashboardPage() {
  const baseUrl = getBaseUrl();
  const info = await getJSON(`${baseUrl}/api/bankr/token/info`);
  const actions = await getJSON(`${baseUrl}/api/bankr/token/actions`);

  return (
    <main className="nn-page-stack">
      <PageHeader
        title="Token"
        subtitle="Inspect Bankr token info and available proposal actions."
        guidance="Review current token state first, then use actions to draft proposals in Operator."
        outputs="Produces: token info JSON and available token action JSON for proposal drafting."
        rightSlot={
          <nav className="flex items-center gap-3 text-sm text-white/80">
            <Link href="/proof" className="underline hover:text-white">
              Proof
            </Link>
            <Link href="/execute" className="underline hover:text-white">
              Execute
            </Link>
          </nav>
        }
      />

      <section className="nn-surface">
        <h3>Status</h3>
        <pre className="mt-2 max-h-[380px] overflow-auto rounded-lg border border-white/12 bg-black/30 p-3 text-xs">
          {JSON.stringify(info, null, 2)}
        </pre>
      </section>

      <section className="nn-surface">
        <div className="flex items-center justify-between gap-3">
          <h3>Available Actions</h3>
          <a className="text-sm underline text-white/80 hover:text-white" href="/api/bankr/token/actions" target="_blank" rel="noreferrer">
            Open JSON
          </a>
        </div>
        <pre className="mt-2 max-h-[380px] overflow-auto rounded-lg border border-white/12 bg-black/30 p-3 text-xs">
          {JSON.stringify(actions, null, 2)}
        </pre>
      </section>
    </main>
  );
}
