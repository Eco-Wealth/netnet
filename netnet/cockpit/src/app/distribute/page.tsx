"use client";

import { useEffect, useMemo, useState } from "react";

type ProofFeedItem = {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  links?: { label: string; url: string }[];
  tags?: string[];
  score?: number;
};

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function DistributePage() {
  const [items, setItems] = useState<ProofFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const r = await fetch("/api/proof/feed", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) setItems(Array.isArray(j.items) ? j.items : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    const t = setInterval(run, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const tags = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) (it.tags || []).forEach((t) => s.add(t));
    return ["all", ...Array.from(s).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((it) => {
      const tagOk = tag === "all" ? true : (it.tags || []).includes(tag);
      const qOk =
        !query ||
        it.title.toLowerCase().includes(query) ||
        it.summary.toLowerCase().includes(query) ||
        (it.tags || []).some((t) => t.toLowerCase().includes(query));
      return tagOk && qOk;
    });
  }, [items, q, tag]);

  const totalScore = useMemo(() => filtered.reduce((a, b) => a + (b.score || 0), 0), [filtered]);

  return (
    <div className="nn-page max-w-5xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="nn-page-title">Distribution</h1>
          <p className="nn-page-subtitle">
            Shareable proof feed + lightweight progress UI. Refreshes automatically.
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
            <div className="text-xs text-[color:var(--muted)]">Progress</div>
            <div className="text-lg font-semibold">{totalScore}</div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search proofs…"
            className="nn-input nn-focus h-10 w-full md:w-64"
          />

          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="nn-input nn-focus h-10"
          >
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <a
            href="/api/proof/feed?format=rss"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm hover:bg-[color:var(--surface-2)]"
            target="_blank"
            rel="noreferrer"
          >
            RSS
          </a>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {loading ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--muted)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--muted)]">
            No items yet. Generate proofs via <span className="font-mono">/proof</span> or the agent routes.
          </div>
        ) : (
          filtered.map((it) => (
            <div
              key={it.id}
              className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition hover:border-[color:var(--surface-3)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold">{it.title}</h2>
                    {typeof it.score === "number" && (
                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-0.5 text-xs">
                        +{it.score}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">{fmt(it.createdAt)}</div>
                </div>

                <button
                  onClick={() => navigator.clipboard?.writeText(location.origin + "/distribute#" + it.id)}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1.5 text-xs hover:opacity-95"
                  title="Copy share link"
                >
                  Copy link
                </button>
              </div>

              <p className="mt-2 text-sm text-[color:var(--muted)]">{it.summary}</p>

              {(it.tags || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(it.tags || []).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTag(t)}
                      className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                      title="Filter by tag"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {(it.links || []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {it.links!.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1.5 text-xs hover:opacity-95"
                      title={l.url}
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
