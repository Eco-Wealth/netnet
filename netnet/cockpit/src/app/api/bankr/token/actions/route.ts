import { NextResponse } from "next/server";
import { tokenActionCatalog } from "@/lib/bankr/token";
import { getWalletProfileById } from "@/lib/operator/walletProfiles";
import { sendPrivyTransaction, type PrivyTransaction } from "@/lib/privy";

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readTxField(
  value: Record<string, unknown>,
  key: keyof PrivyTransaction
): string | undefined {
  const candidate = value[key];
  if (typeof candidate !== "string") return undefined;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTransaction(params: Record<string, unknown>): PrivyTransaction | null {
  const txSource =
    params.transaction && typeof params.transaction === "object"
      ? toRecord(params.transaction)
      : params;
  const to = readTxField(txSource, "to");
  if (!to) return null;
  return {
    to,
    data: readTxField(txSource, "data"),
    value: readTxField(txSource, "value"),
    gasLimit: readTxField(txSource, "gasLimit"),
    maxFeePerGas: readTxField(txSource, "maxFeePerGas"),
    maxPriorityFeePerGas: readTxField(txSource, "maxPriorityFeePerGas"),
  };
}

async function executePrivyTransaction(params: Record<string, unknown>) {
  const walletProfileId = String(params.walletProfileId || "").trim();
  if (!walletProfileId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MISSING_WALLET_PROFILE",
          message: "walletProfileId is required for execute_privy.",
        },
      },
      { status: 400 }
    );
  }

  const walletProfile = getWalletProfileById(walletProfileId);
  if (!walletProfile) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNKNOWN_WALLET_PROFILE",
          message: `Unknown wallet profile: ${walletProfileId}`,
        },
      },
      { status: 400 }
    );
  }

  if (!walletProfile.privyWalletId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MISSING_PRIVY_WALLET_ID",
          message: `Wallet profile ${walletProfile.id} is missing Privy wallet id config.`,
        },
      },
      { status: 400 }
    );
  }

  const chainCaip2 = String(params.chainCaip2 || walletProfile.chainCaip2 || "").trim();
  if (!chainCaip2) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MISSING_CHAIN_CAIP2",
          message: `Set chainCaip2 in params or profile config for ${walletProfile.id}.`,
        },
      },
      { status: 400 }
    );
  }

  const transaction = normalizeTransaction(params);
  if (!transaction) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BAD_TRANSACTION",
          message: "execute_privy requires transaction.to and optional transaction fields.",
        },
      },
      { status: 400 }
    );
  }

  const result = await sendPrivyTransaction({
    walletId: walletProfile.privyWalletId,
    chainCaip2,
    transaction,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "PRIVY_EXECUTION_FAILED",
          message: result.error,
          details: result.raw,
          status: result.status,
        },
      },
      { status: 400 }
    );
  }

  const { buildActionProof } = await import("@/lib/proof/action");
  const proof = buildActionProof({
    kind: "bankr.token.execute",
    plan: {
      action: "execute_privy",
      walletProfileId: walletProfile.id,
      chain: walletProfile.chain,
      chainCaip2,
      transaction,
      txHash: result.hash,
      ts: new Date().toISOString(),
    },
  });

  return NextResponse.json({
    ok: true,
    execution: {
      mode: "EXECUTE_WITH_LIMITS",
      action: "execute_privy",
      txHash: result.hash,
      walletProfileId: walletProfile.id,
      walletAddress: walletProfile.walletAddress || undefined,
      chain: walletProfile.chain,
      chainCaip2,
    },
    proof,
    nextAction: "Track tx hash and attach downstream proof/certificate output.",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    execution: { mode: "PROPOSE_ONLY", requiresApproval: true },
    requiredOutputs: ["whatWillHappen", "estimatedCosts", "requiresApproval"],
    actions: tokenActionCatalog(),
    nextAction:
      "POST with { action, params } to receive a proposed plan + proof-of-action envelope. Use action=execute_privy with walletProfileId + transaction for gated execution."
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const params = toRecord(body?.params || {});

  if (action === "execute_privy") {
    return executePrivyTransaction(params);
  }

  const catalog = tokenActionCatalog();
  const def = catalog.find(a => a.action === action);

  if (!def) {
    return NextResponse.json(
      { ok: false, error: { code: "UNKNOWN_ACTION", message: "Unknown token action", known: catalog.map(a => a.action) } },
      { status: 400 }
    );
  }

  // Proposal-only: we do not execute. We produce a deterministic "proof-of-action" envelope for auditability.
  const now = new Date().toISOString();
  const plan = {
    action,
    params,
    whatWillHappen: def.whatWillHappen(params),
    estimatedCosts: def.estimatedCosts(params),
    requiresApproval: true,
    safety: def.safety,
    createdAt: now
  };

  const { buildActionProof } = await import("@/lib/proof/action");
  const proof = buildActionProof({ kind: "bankr.token", plan });

  return NextResponse.json({ ok: true, plan, proof, nextAction: "Operator reviews plan, then executes via Bankr (external) or future EXECUTE_WITH_LIMITS mode." });
}
