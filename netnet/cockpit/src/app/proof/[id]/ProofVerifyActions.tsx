"use client";

import { useMemo, useState } from "react";
import { attachProofToWork, createWorkFromProof } from "@/lib/work/proofLink";

type ProofVerificationView = {
  id: string;
  kind: string;
  schema: string;
  hash: string;
  verifyUrl: string;
  payload: Record<string, unknown>;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

type Props = {
  verification: ProofVerificationView;
};

export default function ProofVerifyActions({ verification }: Props) {
  const [busy, setBusy] = useState(false);
  const [workIdInput, setWorkIdInput] = useState("");
  const [createdWorkId, setCreatedWorkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const proofPayload = useMemo(() => {
    const payload = toRecord(verification.payload);
    const refs = {
      ...toRecord(payload.refs),
      verifyUrl: verification.verifyUrl,
    };
    return {
      ...payload,
      id: verification.id,
      kind: verification.kind,
      schema: verification.schema,
      hash: verification.hash,
      refs,
    };
  }, [verification]);

  async function createWork() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createWorkFromProof({
        title: `Proof follow-up: ${verification.kind}`,
        description: `Review verified proof ${verification.id} and complete publishing/audit steps.`,
        tags: ["proof", "verify", "followup"],
        proof: proofPayload,
      });
      setCreatedWorkId(created.id);
      setWorkIdInput(created.id);
      setNotice(`Work created: ${created.id}`);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : "Failed to create work item.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function attachToWork() {
    const targetId = workIdInput.trim();
    if (!targetId) {
      setError("Work ID is required.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await attachProofToWork({
        id: targetId,
        proof: proofPayload,
        note: `Proof attached from verify page (${verification.id}).`,
      });
      setNotice(`Proof attached to ${targetId}`);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : "Failed to attach proof.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="nn-surface">
      <h2 className="mb-2 text-base font-semibold">Work Handoff</h2>
      <p className="nn-page-lead">
        Turn this verified proof into a tracked work item or attach it to an existing one.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={createWork}
          disabled={busy}
          className="rounded-[11px] border border-white/15 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-100 disabled:opacity-50"
        >
          {busy ? "Working..." : "Create Work Item"}
        </button>
        {createdWorkId ? (
          <a
            href={`/work?q=${encodeURIComponent(createdWorkId)}`}
            className="rounded-[11px] border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.11]"
          >
            Open Work
          </a>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={workIdInput}
          onChange={(event) => setWorkIdInput(event.target.value)}
          placeholder="Existing work id"
          className="h-10 rounded-[11px] border border-white/15 bg-white/[0.04] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
        />
        <button
          type="button"
          onClick={attachToWork}
          disabled={busy || !workIdInput.trim()}
          className="rounded-[11px] border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.09] disabled:opacity-50"
        >
          Attach to Work
        </button>
      </div>

      {notice ? (
        <div className="mt-3 rounded-[11px] border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mt-3 rounded-[11px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
    </section>
  );
}
