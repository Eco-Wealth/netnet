import { NextRequest, NextResponse } from "next/server";
import { getRetirementQuote } from "@/lib/bridge";

/**
 * POST /api/bridge/quote
 * 
 * Get a retirement quote estimate for a carbon credit retirement.
 * 
 * Request body:
 * {
 *   "projectId": "string",
 *   "amount": number,
 *   "token": "USDC" | "ETH" | etc,
 *   "chain": "base" | "ethereum" | etc
 * }
 * 
 * Response:
 * {
 *   "projectId": "string",
 *   "amount": number,
 *   "token": "string",
 *   "chain": "string",
 *   "estimatedCredits": number,
 *   "estimatedCost": number,
 *   "pricePerCredit": number,
 *   "expiresAt": "ISO timestamp",
 *   "quoteId": "string"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    const { projectId, amount, token, chain } = body as {
      projectId?: string;
      amount?: number;
      token?: string;
      chain?: string;
    };

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

    const quote = await getRetirementQuote(projectId, amount, token, chain);
    
    return NextResponse.json(quote);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
