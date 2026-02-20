/**
 * Unit 55 — Bankr Token Launcher (propose-only integration)
 *
 * Goal:
 * - Provide a stable internal interface for "launch token" style operations via Bankr.
 * - Keep default posture SAFE: propose-only (no funds movement unless operator approves elsewhere).
 *
 * Notes:
 * - Bankr's public interfaces can evolve. This module is intentionally conservative:
 *   it defines a minimal request/response contract we control and can adapt.
 * - Actual execution should remain gated behind policy (Unit 29/32/38) + operator approval (Unit 21).
 */

import { z } from "zod";
import { httpJson } from "@/lib/http";
import { env } from "@/lib/env";

export const BankrLaunchRequest = z.object({
  // Human-facing identity
  name: z.string().min(1),
  symbol: z.string().min(1).max(12),

  // Chain/program context (Bankr supports multi-chain; we keep it explicit)
  chain: z.string().min(1),

  // Economic intent (not necessarily 1:1 with Bankr params)
  initialLiquidityUsd: z.number().nonnegative().optional(),
  notes: z.string().optional(),

  // Operator gating metadata (always required for propose-only flows)
  operator: z.object({
    id: z.string().min(1),
    reason: z.string().min(1),
  }),
});

export type BankrLaunchRequest = z.infer<typeof BankrLaunchRequest>;

export type BankrLaunchProposal = {
  ok: true;
  mode: "PROPOSE_ONLY";
  proposalId: string;
  summary: string;

  // What will happen (human-readable)
  whatWillHappen: string[];

  // Estimated costs (best-effort)
  estimatedCosts: {
    launchFeePct?: number; // informational
    swapFeePct?: number;   // informational (Bankr mentions 1.2% total swap fee)
    networkFeesUsd?: number;
    notes?: string;
  };

  requiresApproval: true;

  // Evidence payload for downstream proof-of-action (Unit 6/19/38)
  proofIntent: {
    kind: "bankr_token_launch";
    ts: string;
    chain: string;
    name: string;
    symbol: string;
    operatorId: string;
    reason: string;
  };
};

/**
 * createLaunchProposal()
 * - returns a proposal packet that can be surfaced in UI and logged.
 * - does NOT perform the launch.
 */
export function createLaunchProposal(req: BankrLaunchRequest): BankrLaunchProposal {
  const now = new Date().toISOString();
  const proposalId = `bnkr_launch_${now.replace(/[:.]/g, "-")}_${req.symbol.toLowerCase()}`;

  const whatWillHappen = [
    `Prepare a Bankr token launch proposal for ${req.name} (${req.symbol}) on chain "${req.chain}".`,
    `If approved, operator will execute launch via Bankr tooling using the proposal packet.`,
    `After launch, fees earned by the token ecosystem can be routed per policy (Unit 38) to fund inference + micro-retire intents.`,
  ];

  return {
    ok: true,
    mode: "PROPOSE_ONLY",
    proposalId,
    summary: `Launch proposal for ${req.symbol} on ${req.chain}`,
    whatWillHappen,
    estimatedCosts: {
      swapFeePct: 1.2,
      notes:
        "Swap fee % is informational from Bankr announcement. Network fees vary by chain. This endpoint is propose-only.",
    },
    requiresApproval: true,
    proofIntent: {
      kind: "bankr_token_launch",
      ts: now,
      chain: req.chain,
      name: req.name,
      symbol: req.symbol,
      operatorId: req.operator.id,
      reason: req.operator.reason,
    },
  };
}

/**
 * Optional: forward proposal to a Bankr endpoint if configured.
 * This remains propose-only; the remote endpoint is expected to store/track the proposal.
 */
export async function submitLaunchProposal(proposal: BankrLaunchProposal) {
  const base = env().BANKR_API_BASE_URL;
  if (!base) {
    return {
      ok: true as const,
      stored: false,
      note: "BANKR_API_BASE_URL not set; proposal not submitted (local propose-only).",
      proposal,
    };
  }

  // Conservative endpoint name (can be adapted)
  const url = `${base.replace(/\/$/, "")}/v1/proposals/token-launch`;
  return httpJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ proposal }),
    timeoutMs: 12_000,
  });
}
