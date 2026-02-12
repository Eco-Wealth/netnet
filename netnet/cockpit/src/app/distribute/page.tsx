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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Distribution</h1>
          <p className="text-sm text-neutral-500">
            Shareable proof feed + lightweight progress UI. Refreshes automatically.
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="rounded-xl border bg-white px-3 py-2 shadow-sm">
            <div className="text-xs text-neutral-500">Progress</div>
            <div className="text-lg font-semibold">{totalScore}</div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search proofs…"
            className="h-10 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200 md:w-64"
          />

          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="h-10 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
          >
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <a
            href="/api/proof/feed?format=rss"
            className="h-10 rounded-xl border bg-white px-3 text-sm inline-flex items-center justify-center hover:bg-neutral-50"
            target="_blank"
            rel="noreferrer"
          >
            RSS
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {loading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600">
            No items yet. Generate proofs via <span className="font-mono">/proof</span> or the agent routes.
          </div>
        ) : (
          filtered.map((it) => (
            <div
              key={it.id}
              className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold">{it.title}</h2>
                    {typeof it.score === "number" && (
                      <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-white">
                        +{it.score}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">{fmt(it.createdAt)}</div>
                </div>

                <button
                  onClick={() => navigator.clipboard?.writeText(location.origin + "/distribute#" + it.id)}
                  className="rounded-xl border px-3 py-2 text-xs opacity-80 hover:bg-neutral-50 hover:opacity-100"
                  title="Copy share link"
                >
                  Copy link
                </button>
              </div>

              <p className="mt-3 text-sm text-neutral-700">{it.summary}</p>

              {(it.tags || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(it.tags || []).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTag(t)}
                      className="rounded-full border px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
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
                      className="rounded-xl border px-3 py-2 text-xs text-neutral-800 hover:bg-neutral-50"
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
