import { NextRequest, NextResponse } from "next/server";
import { enforcePolicy } from "@/lib/policy/enforce";
import { getWalletProfileById } from "@/lib/operator/walletProfiles";
import { sendPrivyTransaction, type PrivyTransaction } from "@/lib/privy";
import { buildActionProof } from "@/lib/proof/action";

const ACTION_ID = "zora.post.content" as const;
const ROUTE_ID = "/api/agent/zora";
const VENUE = "zora";

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeTransaction(input: Record<string, unknown>): PrivyTransaction | null {
  const txSource =
    input.transaction && typeof input.transaction === "object"
      ? toRecord(input.transaction)
      : input;
  const to = readString(txSource.to);
  if (!to) return null;
  const tx: PrivyTransaction = { to };
  const data = readString(txSource.data);
  const value = readString(txSource.value);
  const gasLimit = readString(txSource.gasLimit);
  const maxFeePerGas = readString(txSource.maxFeePerGas);
  const maxPriorityFeePerGas = readString(txSource.maxPriorityFeePerGas);
  if (data) tx.data = data;
  if (value) tx.value = value;
  if (gasLimit) tx.gasLimit = gasLimit;
  if (maxFeePerGas) tx.maxFeePerGas = maxFeePerGas;
  if (maxPriorityFeePerGas) tx.maxPriorityFeePerGas = maxPriorityFeePerGas;
  return tx;
}

export async function GET(req: NextRequest) {
  const gate = enforcePolicy(ACTION_ID, { route: ROUTE_ID, venue: VENUE, action: ACTION_ID });
  return NextResponse.json({
    ok: gate.ok,
    actions: [ACTION_ID],
    route: ROUTE_ID,
    safety: {
      mode: "PROPOSE_ONLY",
      requiresApproval: true,
      note: "Execution requires approved proposal + locked intent + executor boundary.",
    },
    nextAction:
      "POST with { action: 'zora.post.content', content, walletProfileId?, target?, transaction? }.",
    policy: gate.policy,
  });
}

export async function POST(req: NextRequest) {
  const body = toRecord(await req.json().catch(() => ({})));
  const actionRaw = readString(body.action || ACTION_ID).toLowerCase();
  const action = actionRaw === "post" || actionRaw === "post_content" ? ACTION_ID : actionRaw;

  if (action !== ACTION_ID) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNKNOWN_ACTION",
          message: `Unsupported action: ${action}. Use ${ACTION_ID}.`,
        },
      },
      { status: 400 }
    );
  }

  const content = readString(body.content || body.text || body.caption);
  if (!content) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MISSING_CONTENT",
          message: "content is required for zora.post.content",
        },
      },
      { status: 400 }
    );
  }

  const gate = enforcePolicy(ACTION_ID, {
    route: ROUTE_ID,
    venue: VENUE,
    action: ACTION_ID,
    chain: readString(body.chain) || undefined,
  });
  if (!gate.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "POLICY_DENIED",
          message: "Policy denied zora connector action.",
          reasons: gate.reasons,
        },
      },
      { status: 403 }
    );
  }

  const executeRequested = body.execute === true;
  const walletProfileId = readString(body.walletProfileId);

  const plan = {
    action: ACTION_ID,
    route: ROUTE_ID,
    venue: VENUE,
    walletProfileId: walletProfileId || undefined,
    target: readString(body.target) || "zora-feed",
    contentPreview: content.length > 280 ? `${content.slice(0, 280)}...` : content,
    requiresApproval: true,
    createdAt: new Date().toISOString(),
  };

  if (!executeRequested) {
    return NextResponse.json({
      ok: true,
      mode: "PROPOSE_ONLY",
      requiresApproval: true,
      plan,
      proof: buildActionProof({ kind: "zora.post.plan", plan }),
      nextAction: "Approve proposal, lock intent, then execute through Operator boundary.",
    });
  }

  if (!walletProfileId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MISSING_WALLET_PROFILE",
          message: "walletProfileId is required for execute=true.",
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

  const transaction = normalizeTransaction(body);
  if (!transaction) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MISSING_TRANSACTION",
          message: "transaction payload with at least 'to' is required for execute=true.",
        },
      },
      { status: 400 }
    );
  }

  const chainCaip2 = readString(body.chainCaip2 || walletProfile.chainCaip2);
  if (!chainCaip2 || !walletProfile.privyWalletId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MISSING_PRIVY_CONFIG",
          message: "Wallet profile is missing privyWalletId or chainCaip2 configuration.",
        },
      },
      { status: 400 }
    );
  }

  const execution = await sendPrivyTransaction({
    walletId: walletProfile.privyWalletId,
    chainCaip2,
    transaction,
  });

  if (!execution.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "PRIVY_EXECUTION_FAILED",
          message: execution.error,
          status: execution.status,
          details: execution.raw,
        },
      },
      { status: 400 }
    );
  }

  const result = {
    action: ACTION_ID,
    route: ROUTE_ID,
    venue: VENUE,
    txHash: execution.hash,
    walletProfileId: walletProfile.id,
    walletAddress: walletProfile.walletAddress || undefined,
    chain: walletProfile.chain,
    chainCaip2,
    postedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    ok: true,
    mode: "EXECUTE_WITH_LIMITS",
    requiresApproval: true,
    execution: result,
    proof: buildActionProof({ kind: "zora.post.execute", plan: result }),
    nextAction: "Track tx hash and attach proof artifact in /proof.",
  });
}
