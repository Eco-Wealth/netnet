import Link from "next/link";
import { STRATEGY_PROGRAMS } from "@/lib/programs/presets";

export default function ProgramsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Programs</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Strategy presets: curated step sequences that an operator (or agent) can run safely.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {STRATEGY_PROGRAMS.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5 shadow-sm hover:border-neutral-700 transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-medium">{p.name}</div>
                <div className="mt-1 text-sm text-neutral-400">{p.description}</div>
              </div>
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                {p.autonomyDefault}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-400"
                  title={t}
                >
                  {t}
                </span>
              ))}
            </div>

            <ol className="mt-5 space-y-2">
              {p.steps.map((s, idx) => (
                <li key={s.id} className="rounded-xl border border-neutral-900 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {idx + 1}. {s.title}
                    </div>
                    {s.endpoint ? (
                      <code className="text-[11px] text-neutral-500">{s.method ?? "GET"} {s.endpoint}</code>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">{s.summary}</div>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex items-center justify-between">
              <Link
                href="/execute"
                className="text-sm text-neutral-200 hover:text-white underline underline-offset-4"
              >
                Open Execute
              </Link>
              <Link
                href="/proof"
                className="text-sm text-neutral-200 hover:text-white underline underline-offset-4"
              >
                Open Proof
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
        <div className="text-sm font-medium">API</div>
        <p className="mt-1 text-sm text-neutral-400">
          Programs are also available machine-readable at <code className="text-neutral-300">/api/programs</code>.
        </p>
      </div>
    </main>
  );
}
