import crypto from "crypto";

export type ActionProofEnvelope = {
  schema: "netnet.proof.action.v1";
  id: string;
  createdAt: string;
  kind: string;
  plan: unknown;
  hash: string;
};

export function buildActionProof(input: { kind: string; plan: unknown }): ActionProofEnvelope {
  const createdAt = new Date().toISOString();
  const material = JSON.stringify({ schema: "netnet.proof.action.v1", createdAt, kind: input.kind, plan: input.plan });
  const hash = crypto.createHash("sha256").update(material).digest("hex");
  const id = `act_${hash.slice(0, 16)}`;

  return {
    schema: "netnet.proof.action.v1",
    id,
    createdAt,
    kind: input.kind,
    plan: input.plan,
    hash
  };
}
