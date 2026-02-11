import { fetchJson } from "@/lib/http/fetchJson";

export type BankrLaunchProposal = {
  name: string;
  symbol: string;
  chain: string;
  description?: string;
  website?: string;
  twitter?: string;
  imageUrl?: string;
  feeRouting?: {
    operatorBps?: number;
    inferenceBps?: number;
    microRetireBps?: number;
    treasuryBps?: number;
    notes?: string;
  };
};

export type BankrLaunchEnvelope = {
  ok: true;
  requiresApproval: true;
  whatWillHappen: string[];
  estimatedCosts: {
    usd: number;
    notes: string[];
  };
  proposal: BankrLaunchProposal;
  proof: any;
};

function bankrBase(): string {
  const base = (process.env.BANKR_API_BASE_URL || "").trim();
  if (!base) throw new Error("Missing BANKR_API_BASE_URL");
  return base.replace(/\/$/, "");
}

export async function submitLaunchToBankr(proposal: BankrLaunchProposal) {
  const base = bankrBase();
  // Bankr API details intentionally abstracted: this is an optional submit hook.
  const url = `${base}/launch`;
  return fetchJson<any>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(proposal),
    timeoutMs: 20_000,
  });
}

export function buildLaunchEnvelope(proposal: BankrLaunchProposal): BankrLaunchEnvelope {
  const whatWillHappen = [
    `A token launch proposal will be prepared for ${proposal.chain}.`,
    "No onchain action will happen unless you approve execution.",
    "Outputs include a proof-of-action envelope for audit and sharing.",
  ];

  const estimatedCosts = {
    usd: 5,
    notes: [
      "Estimate only (gas/fees vary by chain and market conditions).",
      "Execution is operator-approved; no funds move in propose-only mode.",
    ],
  };

  const proof = {
    kind: "netnet.proof.v1",
    subject: { type: "bankr.launch.proposal", chain: proposal.chain, symbol: proposal.symbol },
    refs: {},
    claims: {
      proposal,
      requiresApproval: true,
      estimatedCosts,
    },
    createdAt: new Date().toISOString(),
  };

  return { ok: true, requiresApproval: true, whatWillHappen, estimatedCosts, proposal, proof };
}
