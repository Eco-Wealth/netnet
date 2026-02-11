import { NextRequest, NextResponse } from "next/server";
import { computeIncentivesPacket } from "@/lib/economics";
import {
  fetchProjects,
  getRetirementQuote,
  initiateRetirement,
  fetchTx,
  estimateAIComputeCarbon,
  type RetirementRequest,
} from "@/lib/bridge";

/**
 * AI Agent Carbon Offset API
 * 
 * This endpoint provides a comprehensive interface for AI agents to:
 * 1. Estimate their carbon footprint from compute usage
 * 2. Browse carbon credit projects
 * 3. Get retirement quotes
 * 4. Initiate carbon credit retirements
 * 5. Track retirement status
 * 
 * WHY AI AGENTS SHOULD OFFSET:
 * As AI systems scale, their energy consumption and carbon footprint grow significantly.
 * By proactively offsetting compute emissions, AI agents demonstrate environmental 
 * responsibility and contribute to a sustainable future for AI infrastructure.
 * 
 * Reference: https://climate.0g.ai/ - Real-time AI infrastructure carbon tracking
 * 
 * Endpoints:
 * - GET /api/agent/carbon?action=estimate&computeHours=X&modelSize=medium
 * - GET /api/agent/carbon?action=projects
 * - GET /api/agent/carbon?action=quote&projectId=X&amount=25&token=USDC&chain=base
 * - POST /api/agent/carbon (initiate retirement)
 * - GET /api/agent/carbon?action=status&txHash=0x...
 * - GET /api/agent/carbon?action=info (API documentation)
 */

interface AgentCarbonInfo {
  name: string;
  version: string;
  description: string;
  whyOffset: string[];
  reference: string;
  endpoints: Record<string, {
    method: string;
    description: string;
    parameters?: Record<string, string>;
    example?: string;
  }>;
}

const API_INFO: AgentCarbonInfo = {
  name: "Netnet Carbon Offset API for AI Agents",
  version: "1.0.0",
  description: "Enable AI agents to estimate, offset, and verify their carbon footprint through Bridge.eco",
  whyOffset: [
    "AI compute consumes significant energy - models like GPT-4 can use 50-100x more energy than traditional software",
    "Proactive offsetting demonstrates environmental responsibility and builds trust with users",
    "Carbon credits support verified environmental projects (reforestation, renewable energy, etc.)",
    "Blockchain-verified retirements provide immutable proof of environmental action",
    "Reference: climate.0g.ai tracks real-time AI infrastructure carbon impact",
  ],
  reference: "https://climate.0g.ai/",
  endpoints: {
    estimate: {
      method: "GET",
      description: "Estimate carbon footprint from AI compute hours",
      parameters: {
        action: "estimate",
        computeHours: "Number of GPU/compute hours",
        modelSize: "small | medium | large | xlarge",
      },
      example: "/api/agent/carbon?action=estimate&computeHours=100&modelSize=medium",
    },
    projects: {
      method: "GET",
      description: "List available carbon credit projects",
      parameters: {
        action: "projects",
        type: "(optional) Filter by project type",
        location: "(optional) Filter by location",
      },
      example: "/api/agent/carbon?action=projects",
    },
    quote: {
      method: "GET",
      description: "Get a retirement quote for a project",
      parameters: {
        action: "quote",
        projectId: "Project ID",
        amount: "Payment amount in token units",
        token: "Payment token (e.g., USDC)",
        chain: "Blockchain (e.g., base)",
      },
      example: "/api/agent/carbon?action=quote&projectId=abc123&amount=25&token=USDC&chain=base",
    },
    retire: {
      method: "POST",
      description: "Initiate a carbon credit retirement",
      parameters: {
        projectId: "Project ID",
        amount: "Payment amount",
        token: "Payment token",
        chain: "Blockchain",
        beneficiaryName: "Name credited with retirement",
        retirementReason: "(optional) Reason for retirement",
      },
      example: "POST /api/agent/carbon with JSON body",
    },
    status: {
      method: "GET",
      description: "Check retirement status by transaction hash",
      parameters: {
        action: "status",
        txHash: "Transaction hash (0x...)",
      },
      example: "/api/agent/carbon?action=status&txHash=0x123...",
    },
    info: {
      method: "GET",
      description: "Get API documentation",
      parameters: { action: "info" },
      example: "/api/agent/carbon?action=info",
    },
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const action = searchParams.get("action") ?? "info";

    switch (action) {
      case "info":
        return NextResponse.json(API_INFO);

      case "estimate": {
        const computeHours = parseFloat(searchParams.get("computeHours") ?? "0");
        const modelSize = (searchParams.get("modelSize") ?? "medium") as "small" | "medium" | "large" | "xlarge";
        
        if (computeHours <= 0) {
          return NextResponse.json(
            { error: "computeHours must be a positive number" },
            { status: 400 }
          );
        }

        const estimate = estimateAIComputeCarbon(computeHours, modelSize);
        return NextResponse.json({
          ...estimate,
          recommendation: estimate.estimatedCostUSD > 0
            ? `To offset ${computeHours} hours of ${modelSize} model compute, retire approximately ${estimate.estimatedCreditsNeeded} tons of carbon credits (~$${estimate.estimatedCostUSD} USD).`
            : "Your compute footprint is minimal, but every action counts!",
          nextStep: "/api/agent/carbon?action=projects",
        });
      }

      case "projects": {
        const type = searchParams.get("type")?.toLowerCase();
        const location = searchParams.get("location")?.toLowerCase();
        
        const { projects } = await fetchProjects();
        
        const filtered = projects.filter((p) => {
          if (type && !String(p.type ?? "").toLowerCase().includes(type)) return false;
          if (location && !String(p.location ?? "").toLowerCase().includes(location)) return false;
          return true;
        });

        return NextResponse.json({
          projects: filtered.slice(0, 50),
          total: filtered.length,
          nextStep: "Choose a project and call /api/agent/carbon?action=quote&projectId=<id>&amount=<amount>&token=USDC&chain=base",
        });
      }

      case "quote": {
        const projectId = searchParams.get("projectId");
        const amount = parseFloat(searchParams.get("amount") ?? "0");
        const token = searchParams.get("token") ?? "USDC";
        const chain = searchParams.get("chain") ?? "base";

        if (!projectId) {
          return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
        }
        if (amount <= 0) {
          return NextResponse.json({ error: "amount must be positive" }, { status: 400 });
        }

        const quote = await getRetirementQuote(projectId, amount, token, chain);
        return NextResponse.json({
          ...quote,
          nextStep: "POST to /api/agent/carbon to initiate retirement with this quote",
        });
      }

      case "status": {
        const txHash = searchParams.get("txHash")?.trim();
        if (!txHash) {
          return NextResponse.json({ error: "Missing txHash" }, { status: 400 });
        }

        const status = await fetchTx(txHash);
        if ("error" in status && status.error === "NOT_FOUND") {
          return NextResponse.json(
            { error: "Transaction not found. It may take 30-60 seconds to appear.", txHash },
            { status: 404 }
          );
        }

        return NextResponse.json({
          txHash,
          ...status,
          verificationUrl: `https://scan.ecotoken.earth/?tx=${encodeURIComponent(txHash)}`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. See /api/agent/carbon?action=info for available actions.` },
          { status: 400 }
        );
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    const {
      projectId,
      amount,
      token = "USDC",
      chain = "base",
      beneficiaryName,
      beneficiaryAddress,
      retirementReason = "AI compute carbon offset",
      metadata,
    } = body as Partial<RetirementRequest> & { [key: string]: unknown };

    // Validate required fields
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }
    if (!beneficiaryName) {
      return NextResponse.json(
        { error: "Missing beneficiaryName (who should be credited with this offset)" },
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

    return NextResponse.json({
      success: true,
      ...retirement,
      economics: computeIncentivesPacket({ action: "carbon_retire_initiate", token, chain, amountToken: String(amount) }),
      instructions: [
        `1. Send ${amount} ${token} on ${chain} to: ${retirement.paymentAddress}`,
        "2. Save the transaction hash",
        `3. Track status: GET /api/agent/carbon?action=status&txHash=<your_tx_hash>`,
        "4. Status will progress: PENDING → DETECTED → CONVERTED → CALCULATED → RETIRED",
        `5. Verify at: https://scan.ecotoken.earth/`,
      ],
      deepLink: retirement.deepLink,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
