export type ProofLike = {
  kind?: string;
  subject?: any;
  refs?: Record<string, any>;
  claims?: Record<string, any>;
  createdAt?: string;
  hash?: string;
};

export async function createWorkFromProof(args: {
  title: string;
  description?: string;
  proof: ProofLike;
  tags?: string[];
}) {
  const res = await fetch("/api/work", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: args.title,
      description: args.description ?? "Created from proof output.",
      tags: args.tags ?? ["proof"],
      priority: "MEDIUM",
      owner: "operator",
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || "Failed to create work item");
  }
  const id = body.id || body.item?.id;
  if (!id) throw new Error("Work create response missing id");

  // Attach proof as an event
  await fetch(`/api/work/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "PROOF_ATTACHED",
      by: "operator",
      note: "Proof attached from Proof panel.",
      patch: { proof: args.proof },
    }),
  }).catch(() => null);

  return { id, item: body.item };
}

export async function attachProofToWork(args: { id: string; proof: ProofLike; note?: string }) {
  const res = await fetch(`/api/work/${encodeURIComponent(args.id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "PROOF_ATTACHED",
      by: "operator",
      note: args.note ?? "Proof attached.",
      patch: { proof: args.proof },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) throw new Error(body?.error || "Failed to attach proof");
  return body;
}
