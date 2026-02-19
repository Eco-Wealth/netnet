import { BRIDGE_ECO_API_BASE } from "@/lib/env";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  type: string;
  location: string;
  registry: string;
  evmWallet?: string;
  description?: string;
  pricePerTon?: number;
  availableCredits?: number;
  vintage?: string;
  methodology?: string;
  certifications?: string[];
}

export interface RetirementQuote {
  projectId: string;
  amount: number;
  token: string;
  chain: string;
  estimatedCredits: number;
  estimatedCost: number;
  pricePerCredit: number;
  expiresAt: string;
  quoteId: string;
}

export interface RetirementRequest {
  projectId: string;
  amount: number;
  token: string;
  chain: string;
  beneficiaryName: string;
  beneficiaryAddress?: string;
  retirementReason?: string;
  metadata?: Record<string, unknown>;
}

export interface RetirementResponse {
  retirementId: string;
  status: "PENDING" | "DETECTED" | "CONVERTED" | "CALCULATED" | "RETIRED" | "FAILED";
  paymentAddress: string;
  amount: number;
  token: string;
  chain: string;
  projectId: string;
  estimatedCredits: number;
  createdAt: string;
  expiresAt: string;
  deepLink: string;
}

export interface TransactionStatus {
  status: string;
  usd_value?: number;
  credits_amount?: number;
  certificate_id?: string;
  timeline?: Array<{
    step: string;
    status: string;
    timestamp: string;
  }>;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry & Projects
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchRegistry() {
  const res = await fetch(`${BRIDGE_ECO_API_BASE}/registry`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Bridge.eco /registry failed: ${res.status}`);
  return res.json();
}

export async function fetchProjects(): Promise<{ projects: Project[] }> {
  const registry = await fetchRegistry();
  return { projects: registry?.projects ?? [] };
}

export async function fetchProject(projectId: string): Promise<Project | null> {
  const { projects } = await fetchProjects();
  return projects.find((p) => p.id === projectId) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Tracking
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTx(txHash: string): Promise<TransactionStatus | { error: "NOT_FOUND" }> {
  const clean = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  const res = await fetch(`${BRIDGE_ECO_API_BASE}/transactions/${clean}`, {
    cache: "no-store",
  });
  if (res.status === 404) return { error: "NOT_FOUND" as const };
  if (!res.ok) throw new Error(`Bridge.eco /transactions/{hash} failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Retirement Quote & Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a retirement quote estimate for a project.
 * This calculates how many credits will be retired for a given payment amount.
 */
export async function getRetirementQuote(
  projectId: string,
  amount: number,
  token: string,
  chain: string
): Promise<RetirementQuote> {
  // Try Bridge.eco quote endpoint first
  const res = await fetch(`${BRIDGE_ECO_API_BASE}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: projectId,
      amount,
      token,
      chain,
    }),
    cache: "no-store",
  });

  if (res.ok) {
    const data = await res.json();
    return {
      projectId,
      amount,
      token,
      chain,
      estimatedCredits: data.credits ?? data.estimated_credits ?? amount / 25,
      estimatedCost: data.cost ?? data.estimated_cost ?? amount,
      pricePerCredit: data.price_per_credit ?? 25,
      expiresAt: data.expires_at ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      quoteId: data.quote_id ?? `quote_${Date.now()}`,
    };
  }

  // Fallback: estimate based on typical carbon credit pricing (~$25/ton)
  const pricePerCredit = 25;
  const estimatedCredits = amount / pricePerCredit;
  
  return {
    projectId,
    amount,
    token,
    chain,
    estimatedCredits,
    estimatedCost: amount,
    pricePerCredit,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    quoteId: `quote_${Date.now()}_${projectId}`,
  };
}

/**
 * Initiate a retirement request via Bridge.eco.
 * Returns payment details and tracking info.
 */
export async function initiateRetirement(
  request: RetirementRequest
): Promise<RetirementResponse> {
  // First, get the project to find the payment wallet
  const project = await fetchProject(request.projectId);
  if (!project) {
    throw new Error(`Project not found: ${request.projectId}`);
  }

  // Try Bridge.eco retirement endpoint
  const res = await fetch(`${BRIDGE_ECO_API_BASE}/retirement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: request.projectId,
      amount: request.amount,
      token: request.token,
      chain: request.chain,
      beneficiary_name: request.beneficiaryName,
      beneficiary_address: request.beneficiaryAddress,
      retirement_reason: request.retirementReason,
      metadata: request.metadata,
    }),
    cache: "no-store",
  });

  if (res.ok) {
    const data = await res.json();
    return {
      retirementId: data.retirement_id ?? data.id,
      status: data.status ?? "PENDING",
      paymentAddress: data.payment_address ?? project.evmWallet ?? "",
      amount: request.amount,
      token: request.token,
      chain: request.chain,
      projectId: request.projectId,
      estimatedCredits: data.estimated_credits ?? request.amount / 25,
      createdAt: data.created_at ?? new Date().toISOString(),
      expiresAt: data.expires_at ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      deepLink: data.deep_link ?? generateDeepLink(request.projectId, request.amount, request.chain, request.token),
    };
  }

  // Fallback: return payment info for manual processing
  const retirementId = `ret_${Date.now()}_${request.projectId.slice(0, 8)}`;
  
  return {
    retirementId,
    status: "PENDING",
    paymentAddress: project.evmWallet ?? "",
    amount: request.amount,
    token: request.token,
    chain: request.chain,
    projectId: request.projectId,
    estimatedCredits: request.amount / 25,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    deepLink: generateDeepLink(request.projectId, request.amount, request.chain, request.token),
  };
}

/**
 * Generate a Bridge.eco deep link for the Impact widget.
 */
export function generateDeepLink(
  projectId: string,
  amount: number,
  chain: string,
  token: string
): string {
  const params = new URLSearchParams({
    tab: "impact",
    project: projectId,
    amount: String(amount),
    chain,
    token,
  });
  return `https://bridge.eco/?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Agent Carbon Footprint Estimation
// ─────────────────────────────────────────────────────────────────────────────

export interface CarbonEstimate {
  estimatedKgCO2: number;
  estimatedCreditsNeeded: number;
  estimatedCostUSD: number;
  methodology: string;
  source: string;
}

/**
 * Estimate carbon footprint for AI compute usage.
 * Based on typical AI model inference/training energy consumption.
 * 
 * Reference: climate.0g.ai provides real-time projections for decentralized AI carbon impact.
 */
export function estimateAIComputeCarbon(
  computeHours: number,
  modelSize: "small" | "medium" | "large" | "xlarge" = "medium"
): CarbonEstimate {
  // Carbon intensity estimates (kg CO2 per compute hour)
  // Based on industry averages and research on AI energy consumption
  const carbonIntensity: Record<typeof modelSize, number> = {
    small: 0.05,   // ~50g CO2/hour (e.g., small inference)
    medium: 0.2,   // ~200g CO2/hour (e.g., medium model inference)
    large: 0.5,    // ~500g CO2/hour (e.g., large model inference/fine-tuning)
    xlarge: 2.0,   // ~2kg CO2/hour (e.g., training large models)
  };

  const kgCO2 = computeHours * carbonIntensity[modelSize];
  const tonsNeeded = kgCO2 / 1000;
  const pricePerTon = 25; // Average carbon credit price

  // Helper function for consistent rounding
  const roundTo = (value: number, decimals: number): number => 
    Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);

  return {
    estimatedKgCO2: roundTo(kgCO2, 2),
    estimatedCreditsNeeded: Math.max(0.001, roundTo(tonsNeeded, 3)),
    estimatedCostUSD: roundTo(tonsNeeded * pricePerTon, 2),
    methodology: "AI compute carbon estimation based on model size and GPU energy consumption",
    source: "Methodology inspired by climate.0g.ai - Real-time AI infrastructure carbon tracking",
  };
}
