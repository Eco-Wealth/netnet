"use client";

import React from "react";

type Props = {
  item: any;
  onOpen?: (id: string) => void;
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs text-white/85">
      {children}
    </span>
  );
}

type ProofAttachment = {
  proofId?: string;
  proofKind?: string;
  verifyUrl?: string;
  attachedAt?: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function extractProofAttachment(item: any): ProofAttachment | null {
  const events = Array.isArray(item?.events) ? item.events : [];
  let best: { ts: number; data: ProofAttachment } | null = null;

  for (const event of events) {
    const patch = toRecord(event?.patch);
    const proof = toRecord(patch.proof);
    if (!Object.keys(proof).length && event?.type !== "PROOF_ATTACHED") continue;

    const refs = toRecord(proof.refs);
    const proofId = readString(proof.id);
    const proofKind = readString(proof.kind);
    const verifyUrl = readString(refs.verifyUrl) || (proofId ? `/proof/${proofId}` : "");
    const rawTs = readString(event?.at) || readString(event?.ts);
    const ts = rawTs ? Date.parse(rawTs) : 0;

    const data: ProofAttachment = {
      proofId: proofId || undefined,
      proofKind: proofKind || undefined,
      verifyUrl: verifyUrl || undefined,
      attachedAt: rawTs || undefined,
    };

    if (!best || ts >= best.ts) best = { ts, data };
  }

  return best?.data ?? null;
}

export function WorkItemCard({ item, onOpen }: Props) {
  const proofAttachment = extractProofAttachment(item);
  const proofLabel = proofAttachment?.proofId
    ? proofAttachment.proofId.slice(0, 16)
    : "attached";
  const canOpen = typeof onOpen === "function";

  return (
    <div
      role={canOpen ? "button" : undefined}
      tabIndex={canOpen ? 0 : -1}
      onClick={() => onOpen?.(item.id)}
      onKeyDown={(event) => {
        if (!canOpen) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.(item.id);
        }
      }}
      className="w-full text-left rounded-[14px] border border-white/15 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{item.title}</div>
          <div className="mt-1 text-xs text-white/70 line-clamp-2">
            {item.description || "—"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge>{item.status}</Badge>
          <Badge>{item.priority}</Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.owner ? <Badge>Owner: {item.owner}</Badge> : null}
        {Array.isArray(item.tags)
          ? item.tags.slice(0, 6).map((t: string) => <Badge key={t}>#{t}</Badge>)
          : null}
        {item.slaHours ? <Badge>SLA: {item.slaHours}h</Badge> : null}
      </div>

      {proofAttachment ? (
        <div className="mt-3 rounded-[10px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
          <div className="font-medium">
            Proof: <span className="font-mono">{proofLabel}</span>
            {proofAttachment.proofKind ? ` (${proofAttachment.proofKind})` : ""}
          </div>
          {proofAttachment.verifyUrl ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-[10px] text-emerald-200/90">
                verify: {proofAttachment.verifyUrl}
              </span>
              <a
                href={proofAttachment.verifyUrl}
                onClick={(event) => event.stopPropagation()}
                className="rounded border border-emerald-300/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-100 hover:bg-emerald-500/20"
              >
                Open
              </a>
            </div>
          ) : null}
          {proofAttachment.attachedAt ? (
            <div className="mt-1 text-[10px] text-emerald-200/80">
              attached {new Date(proofAttachment.attachedAt).toLocaleString()}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 text-[11px] text-white/60">
        Updated {new Date(item.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
