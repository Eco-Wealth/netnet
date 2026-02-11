import Link from "next/link";
import { STRATEGY_PROGRAMS } from "@/lib/programs/presets";
import { Code, Page, PageHeader, StatusChip } from "@/components/ui";

export default function ProgramsPage() {
  return (
    <Page className="max-w-5xl">
      <PageHeader
        title="Programs"
        subtitle="Strategy presets: curated step sequences an operator or agent can run safely under policy."
      />

      <div className="nn-grid-2">
        {STRATEGY_PROGRAMS.map((p) => (
          <div
            key={p.id}
            className="nn-panel p-4 transition hover:border-[color:var(--surface-3)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold">{p.name}</div>
                <div className="mt-1 text-sm text-[color:var(--muted)]">{p.description}</div>
              </div>
              <StatusChip>{p.autonomyDefault}</StatusChip>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="nn-chip"
                  title={t}
                >
                  {t}
                </span>
              ))}
            </div>

            <ol className="mt-5 space-y-2">
              {p.steps.map((s, idx) => (
                <li key={s.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {idx + 1}. {s.title}
                    </div>
                    {s.endpoint ? (
                      <Code className="text-[11px]">{s.method ?? "GET"} {s.endpoint}</Code>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">{s.summary}</div>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex items-center justify-between">
              <Link
                href="/execute"
                className="text-sm underline underline-offset-4 hover:opacity-90"
              >
                Open Execute
              </Link>
              <Link
                href="/proof"
                className="text-sm underline underline-offset-4 hover:opacity-90"
              >
                Open Proof
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
        <div className="text-sm font-medium">API</div>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Programs are also available machine-readable at <Code>/api/programs</Code>.
        </p>
      </div>
    </Page>
  );
}
