"use client";

import * as React from "react";
import { Button, Input, Muted } from "@/components/ui";
import { createWorkFromProof, attachProofToWork } from "@/lib/work/proofLink";

type ProofBuildResponse = { ok: boolean; proof?: any; error?: string };

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const out = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || out?.ok === false) throw new Error(out?.error || `Request failed: ${res.status}`);
  return out as T;
}

export default function ProofObjectPanel() {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [proof, setProof] = React.useState<any | null>(null);

  // Work linkage
  const [workId, setWorkId] = React.useState("");
  const [workResult, setWorkResult] = React.useState<string | null>(null);

  async function buildProof() {
    setBusy(true);
    setError(null);
    setWorkResult(null);
    try {
      const out = await postJSON<ProofBuildResponse>("/api/proof/build", {
        kind: "netnet.proof.v1",
        subject: { app: "netnet/cockpit", panel: "proof" },
        claims: { note: "manual build" },
      });
      setProof(out.proof ?? out);
    } catch (e: any) {
      setError(e?.message || "Failed to build proof");
    } finally {
      setBusy(false);
    }
  }

  async function createWork() {
    if (!proof) return;
    setBusy(true);
    setError(null);
    setWorkResult(null);
    try {
      const { id } = await createWorkFromProof({
        title: "Review proof output",
        description: "Created from Proof panel. Operator review required.",
        proof,
        tags: ["proof", "review"],
      });
      setWorkId(id);
      setWorkResult(`Created work item ${id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create work");
    } finally {
      setBusy(false);
    }
  }

  async function attachToWork() {
    if (!proof) return;
    if (!workId.trim()) {
      setError("Enter a work id first.");
      return;
    }
    setBusy(true);
    setError(null);
    setWorkResult(null);
    try {
      await attachProofToWork({ id: workId.trim(), proof });
      setWorkResult(`Attached proof to ${workId.trim()}`);
    } catch (e: any) {
      setError(e?.message || "Failed to attach proof");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nw-stack">
      <div className="nw-panel p-3">
        <div className="nw-row justify-between">
          <div>
            <div className="text-sm font-semibold">Proof</div>
            <div className="text-xs nw-muted">Build a proof object and attach it to the work system.</div>
          </div>
          <Button
            onClick={buildProof}
            disabled={busy}
            insight={{
              what: "Build a proof object from current context.",
              when: "After defining subject and claim details.",
              requires: "No spend approval. Proof API request only.",
              output: "Structured proof payload for sharing and audit.",
            }}
          >
            {busy ? "Working…" : "Build proof"}
          </Button>
        </div>

        {error ? <div className="mt-2 text-sm text-red-400">{error}</div> : null}

        {proof ? (
          <div className="mt-3 grid gap-2">
            <div className="rounded-xl border border-white/10 bg-black/40 p-2 text-xs overflow-auto max-h-[260px]">
              <pre>{JSON.stringify(proof, null, 2)}</pre>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <Button
                variant="ghost"
                onClick={createWork}
                disabled={busy}
                insight={{
                  what: "Create a review work item from the generated proof.",
                  when: "After proof generation succeeds.",
                  requires: "Proof object present. Single work API write.",
                  output: "New work item linked to proof context.",
                }}
              >
                Create work from proof
              </Button>

              <div className="md:col-span-2 grid gap-2 md:grid-cols-[1fr_auto] items-center">
                <Input
                  value={workId}
                  onChange={(e) => setWorkId(e.target.value)}
                  placeholder="Work id to attach…"
                />
                <Button
                  variant="ghost"
                  onClick={attachToWork}
                  disabled={busy}
                  insight={{
                    what: "Attach the proof payload to an existing work item.",
                    when: "When a work ID already exists and needs evidence.",
                    requires: "Valid work ID + generated proof. Work event API write.",
                    output: "Proof appended to work timeline.",
                  }}
                >
                  Attach to work
                </Button>
              </div>
            </div>

            {workResult ? <Muted>{workResult}</Muted> : null}
          </div>
        ) : (
          <div className="mt-3">
            <Muted>No proof yet.</Muted>
          </div>
        )}
      </div>
    </div>
  );
}
