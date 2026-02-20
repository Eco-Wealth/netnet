import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { STRATEGY_PROGRAMS } from "@/lib/programs/presets";

export default function ProgramsPage() {
  return (
    <main className="nn-page-stack">
      <PageHeader
        title="Programs"
        subtitle="Use curated strategy presets to draft deterministic plans."
        guidance="Review a preset, inspect its steps, then open Execute or Proof for the next action."
        outputs="Produces: program metadata, deterministic step lists, and run-target links."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {STRATEGY_PROGRAMS.map((p) => (
          <div
            key={p.id}
            className="nn-surface"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-medium">{p.name}</div>
                <div className="mt-1 text-sm text-white/70">{p.description}</div>
              </div>
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs text-white/75">
                {p.autonomyDefault}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/14 bg-white/[0.04] px-2 py-1 text-xs text-white/70"
                  title={t}
                >
                  {t}
                </span>
              ))}
            </div>

            <ol className="mt-4 space-y-2">
              {p.steps.map((s, idx) => (
                <li key={s.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {idx + 1}. {s.title}
                    </div>
                    {s.endpoint ? (
                      <code className="text-[11px] text-white/55">{s.method ?? "GET"} {s.endpoint}</code>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-white/65">{s.summary}</div>
                </li>
              ))}
            </ol>

            <div className="mt-4 flex items-center justify-between">
              <Link
                href="/execute"
                className="text-sm underline text-white/80 hover:text-white"
              >
                Open Execute
              </Link>
              <Link
                href="/proof"
                className="text-sm underline text-white/80 hover:text-white"
              >
                Open Proof
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="nn-surface">
        <div className="text-sm font-medium">API</div>
        <p className="mt-1 text-sm text-white/70">
          Programs are also available at <code className="text-white">/api/programs</code>.
        </p>
      </div>
    </main>
  );
}
