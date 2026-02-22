"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { createWorkFromProof } from "@/lib/work/proofLink";

type ProofFeedItem = {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  links?: { label: string; url: string }[];
  tags?: string[];
  score?: number;
};

const DISTRIBUTE_WORK_LINKS_KEY = "netnet.distribute.workLinks";

type ProofVerificationPayload = {
  ok: boolean;
  verification?: {
    id: string;
    schema: string;
    kind: string;
    hash: string;
    verifyUrl: string;
    payload: Record<string, unknown>;
  };
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

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
  const [linkState, setLinkState] = useState<"all" | "linked" | "unlinked">("all");
  const [busyProofId, setBusyProofId] = useState<string | null>(null);
  const [workByProofId, setWorkByProofId] = useState<Record<string, string>>({});
  const [workErrorByProofId, setWorkErrorByProofId] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DISTRIBUTE_WORK_LINKS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof key === "string" && typeof value === "string" && value.trim()) {
          next[key] = value.trim();
        }
      }
      setWorkByProofId(next);
    } catch {
      // ignore cache parsing errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        DISTRIBUTE_WORK_LINKS_KEY,
        JSON.stringify(workByProofId)
      );
    } catch {
      // ignore cache write errors
    }
  }, [workByProofId]);

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
      const linked = Boolean(workByProofId[it.id]);
      const linkOk =
        linkState === "all" ? true : linkState === "linked" ? linked : !linked;
      const qOk =
        !query ||
        it.title.toLowerCase().includes(query) ||
        it.summary.toLowerCase().includes(query) ||
        (it.tags || []).some((t) => t.toLowerCase().includes(query)) ||
        readString(workByProofId[it.id]).toLowerCase().includes(query);
      return tagOk && linkOk && qOk;
    });
  }, [items, linkState, q, tag, workByProofId]);

  const totalScore = useMemo(() => filtered.reduce((a, b) => a + (b.score || 0), 0), [filtered]);
  const copyLink = useCallback((id: string) => {
    navigator.clipboard?.writeText(`${location.origin}/distribute#${id}`);
  }, []);
  const applyTagFilter = useCallback((nextTag: string) => {
    setTag(nextTag);
  }, []);

  const createWorkFromFeedItem = useCallback(async (item: ProofFeedItem) => {
    setBusyProofId(item.id);
    setWorkErrorByProofId((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    try {
      const verifyRes = await fetch(`/api/proof/verify/${encodeURIComponent(item.id)}`, {
        cache: "no-store",
      });
      const verifyBody = (await verifyRes.json().catch(() => null)) as
        | ProofVerificationPayload
        | null;
      if (!verifyRes.ok || !verifyBody?.ok || !verifyBody.verification) {
        throw new Error("Proof verify failed before work creation.");
      }

      const payload = toRecord(verifyBody.verification.payload);
      const payloadKind = readString(payload.kind);
      const payloadSchema = readString(payload.schema);
      const refs = {
        ...toRecord(payload.refs),
        verifyUrl: verifyBody.verification.verifyUrl || `/proof/${item.id}`,
      };
      const proof = {
        ...payload,
        id: verifyBody.verification.id || item.id,
        kind: verifyBody.verification.kind || payloadKind,
        schema: verifyBody.verification.schema || payloadSchema,
        hash: verifyBody.verification.hash,
        refs,
      };

      const result = await createWorkFromProof({
        title: `Proof follow-up: ${item.title}`,
        description: `Review proof ${item.id}, confirm validity, and publish next action.`,
        tags: ["proof", "distribution", "followup"],
        proof,
      });

      setWorkByProofId((prev) => ({ ...prev, [item.id]: result.id }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create work item.";
      setWorkErrorByProofId((prev) => ({ ...prev, [item.id]: message }));
    } finally {
      setBusyProofId((current) => (current === item.id ? null : current));
    }
  }, []);

  return (
    <div className="nn-page-stack">
      <PageHeader
        title="Distribute"
        subtitle="Share and filter proof feed items."
        guidance="Filter by tag or search text, then open links or copy item URLs for sharing."
        outputs="Produces: filtered proof feed view, share links, RSS feed access, and progress score."
      />

      <div className="nn-surface">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2 shadow-sm">
            <div className="text-xs text-white/60">Progress</div>
            <div className="text-lg font-semibold text-white">{totalScore}</div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search proofs…"
            className="h-10 w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/15 md:w-64"
          />

          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="h-10 rounded-xl border border-white/15 bg-white/[0.03] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
          >
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={linkState}
            onChange={(e) =>
              setLinkState((e.target.value as "all" | "linked" | "unlinked") || "all")
            }
            className="h-10 rounded-xl border border-white/15 bg-white/[0.03] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
          >
            <option value="all">all handoff states</option>
            <option value="linked">linked to work</option>
            <option value="unlinked">not linked</option>
          </select>

          <a
            href="/api/proof/feed?format=rss"
            className="h-10 rounded-xl border border-white/15 bg-white/[0.03] px-3 text-sm inline-flex items-center justify-center hover:bg-white/[0.08]"
            target="_blank"
            rel="noreferrer"
          >
            RSS
          </a>
        </div>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="nn-surface text-sm text-white/70">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="nn-surface text-sm text-white/70">
            No items yet. Generate proofs via <span className="font-mono">/proof</span> or the agent routes.
          </div>
        ) : (
          filtered.map((it) => (
            <div
              key={it.id}
              className="group nn-surface transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-white">{it.title}</h2>
                    {typeof it.score === "number" && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-white">
                        +{it.score}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-white/55">{fmt(it.createdAt)}</div>
                </div>

                <button
                  onClick={() => copyLink(it.id)}
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 opacity-90 hover:bg-white/[0.08] hover:opacity-100"
                  title="Copy share link"
                >
                  Copy link
                </button>
              </div>

              <p className="mt-3 text-sm text-white/80">{it.summary}</p>

              {(it.tags || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(it.tags || []).map((t) => (
                    <button
                      key={t}
                      onClick={() => applyTagFilter(t)}
                      className="rounded-full border border-white/15 px-2 py-1 text-xs text-white/75 hover:bg-white/[0.08]"
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
                      className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/85 hover:bg-white/[0.08]"
                      title={l.url}
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => createWorkFromFeedItem(it)}
                  disabled={busyProofId === it.id}
                  className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/85 hover:bg-white/[0.08] disabled:opacity-50"
                >
                  {busyProofId === it.id ? "Creating..." : "Create Work"}
                </button>
                {workByProofId[it.id] ? (
                  <>
                    <span className="text-xs text-emerald-300">
                      Work: <span className="font-mono">{workByProofId[it.id]}</span>
                    </span>
                    <a
                      href={`/work?q=${encodeURIComponent(workByProofId[it.id])}`}
                      className="rounded-xl border border-white/15 px-2 py-1 text-xs text-white/85 hover:bg-white/[0.08]"
                    >
                      Open Work
                    </a>
                  </>
                ) : null}
                {workErrorByProofId[it.id] ? (
                  <span className="text-xs text-amber-300">
                    {workErrorByProofId[it.id]}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
