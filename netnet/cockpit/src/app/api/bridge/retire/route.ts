import { NextRequest, NextResponse } from "next/server";
import { initiateRetirement, type RetirementRequest } from "@/lib/bridge";
import { computeIncentivesPacket } from "@/lib/economics";

/**
 * POST /api/bridge/retire
 * 
 * Initiate a carbon credit retirement via Bridge.eco.
 * 
 * Request body:
 * {
 *   "projectId": "string",
 *   "amount": number,
 *   "token": "USDC" | "ETH" | etc,
 *   "chain": "base" | "ethereum" | etc,
 *   "beneficiaryName": "string",
 *   "beneficiaryAddress": "string (optional)",
 *   "retirementReason": "string (optional)",
 *   "metadata": { ... } (optional)
 * }
 * 
 * Response:
 * {
 *   "retirementId": "string",
 *   "status": "PENDING" | "DETECTED" | "CONVERTED" | "CALCULATED" | "RETIRED",
 *   "paymentAddress": "0x...",
 *   "amount": number,
 *   "token": "string",
 *   "chain": "string",
 *   "projectId": "string",
 *   "estimatedCredits": number,
 *   "createdAt": "ISO timestamp",
 *   "expiresAt": "ISO timestamp",
 *   "deepLink": "https://bridge.eco/..."
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    const { 
      projectId, 
      amount, 
      token, 
      chain, 
      beneficiaryName,
      beneficiaryAddress,
      retirementReason,
      metadata,
    } = body as Partial<RetirementRequest>;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required field: projectId" },
        { status: 400 }
      );
    }
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }
    if (!token) {
      return NextResponse.json(
        { error: "Missing required field: token (e.g., 'USDC')" },
        { status: 400 }
      );
    }
    if (!chain) {
      return NextResponse.json(
        { error: "Missing required field: chain (e.g., 'base')" },
        { status: 400 }
      );
    }
    if (!beneficiaryName) {
      return NextResponse.json(
        { error: "Missing required field: beneficiaryName (who is credited with the retirement)" },
        { status: 400 }
      );
    }

    const retirement = await initiateRetirement({
      projectId,
      amount,
      token,
      chain,
      beneficiaryName,
      beneficiaryAddress,
      retirementReason,
      metadata,
    });

    const proof = {
      schema: "netnet.proof.v1",
      kind: "bridge_retire_initiate",
      ts: new Date().toISOString(),
      subject: {
        operator: beneficiaryName,
        chain,
        token,
      },
      refs: {
        url: retirement.deepLink,
      },
      claims: {
        projectId,
        amount,
        beneficiaryName,
        retirementReason: retirementReason ?? null,
      },
    };

    return NextResponse.json({
      ok: true,
      mode: "PROPOSE_ONLY",
      requiresApproval: true,
      ...retirement,
      economics: computeIncentivesPacket({
        action: "bridge_retire_initiate",
        token,
        chain,
        amountToken: String(amount),
      }),
      proof,
    });
} catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
