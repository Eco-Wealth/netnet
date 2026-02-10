import Link from "next/link";

async function getJSON(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, error: { message: text } }; }
}

export default async function TokenDashboardPage() {
  const info = await getJSON("http://localhost:3000/api/bankr/token/info");
  const actions = await getJSON("http://localhost:3000/api/bankr/token/actions");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Token lifecycle</h1>
        <nav className="text-sm opacity-80 flex gap-4">
          <Link href="/proof" className="hover:underline">Proof</Link>
          <Link href="/execute" className="hover:underline">Execute</Link>
          <Link href="/retire" className="hover:underline">Retire</Link>
        </nav>
      </div>

      <p className="mt-3 text-sm opacity-80">
        Read-only dashboard for Bankr-based token ops. Execution remains operator-approved.
      </p>

      <section className="mt-8 rounded-xl border p-4">
        <h2 className="text-lg font-medium">Status</h2>
        <pre className="mt-3 overflow-auto rounded-lg bg-black/5 p-3 text-xs">
          {JSON.stringify(info, null, 2)}
        </pre>
      </section>

      <section className="mt-6 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Available actions</h2>
          <a
            className="text-sm opacity-80 hover:underline"
            href="/api/bankr/token/actions"
            target="_blank"
            rel="noreferrer"
          >
            Open JSON
          </a>
        </div>
        <pre className="mt-3 overflow-auto rounded-lg bg-black/5 p-3 text-xs">
          {JSON.stringify(actions, null, 2)}
        </pre>
        <p className="mt-3 text-sm opacity-80">
          Next: Unit 30 wires real prompts for launch/manage/fee routing. This unit exposes a stable surface and proof-of-action schema.
        </p>
      </section>
    </main>
  );
}
