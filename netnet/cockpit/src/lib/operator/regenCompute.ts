import { estimateAIComputeCarbon, initiateRetirement } from "@/lib/bridge";
import { registerProofArtifact, type ProofArtifact } from "@/lib/proof/registry";

type UsageLike = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model?: string;
  provider?: string;
};

export type RegenComputeOffsetInput = {
  usage?: UsageLike;
  source: "operator" | "telegram";
  messageId: string;
  operatorRef?: string;
  allowRetire?: boolean;
};

export type RegenComputeOffsetResult = {
  ok: boolean;
  enabled: boolean;
  attemptedRetire: boolean;
  estimate?: {
    totalTokens: number;
    inferredComputeHours: number;
    estimatedKgCO2: number;
    estimatedCostUSD: number;
  };
  retirement?: {
    success: boolean;
    retirementId?: string;
    status?: string;
    deepLink?: string;
    amountUsd?: number;
    error?: string;
  };
  proof?: ProofArtifact;
  error?: string;
};

function envNumber(name: string, fallback: number): number {
  const raw = String(process.env[name] || "").trim();
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envString(name: string): string {
  return String(process.env[name] || "").trim();
}

function round(value: number, decimals = 6): number {
  const p = Math.pow(10, decimals);
  return Math.round(value * p) / p;
}

function resolveTotalTokens(usage?: UsageLike): number {
  if (!usage) return 0;
  if (typeof usage.totalTokens === "number" && Number.isFinite(usage.totalTokens)) {
    return Math.max(0, Math.floor(usage.totalTokens));
  }
  const promptTokens =
    typeof usage.promptTokens === "number" && Number.isFinite(usage.promptTokens)
      ? usage.promptTokens
      : 0;
  const completionTokens =
    typeof usage.completionTokens === "number" &&
    Number.isFinite(usage.completionTokens)
      ? usage.completionTokens
      : 0;
  return Math.max(0, Math.floor(promptTokens + completionTokens));
}

function shouldEnableComputeOffset(): boolean {
  const value = envString("REGEN_COMPUTE_OFFSET_ENABLED").toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function shouldAutoRetire(): boolean {
  const value = envString("REGEN_COMPUTE_AUTORETIRE").toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function resolveModelSize():
  | "small"
  | "medium"
  | "large"
  | "xlarge" {
  const value = envString("REGEN_COMPUTE_MODEL_SIZE").toLowerCase();
  if (value === "small" || value === "medium" || value === "large" || value === "xlarge") {
    return value;
  }
  return "medium";
}

function buildProofPayload(args: {
  input: RegenComputeOffsetInput;
  estimate: {
    totalTokens: number;
    inferredComputeHours: number;
    estimatedKgCO2: number;
    estimatedCostUSD: number;
  };
  retirement?: {
    success: boolean;
    retirementId?: string;
    status?: string;
    deepLink?: string;
    amountUsd?: number;
    error?: string;
  };
}): Record<string, unknown> {
  return {
    schema: "netnet.proof.v1",
    kind: "regen_compute_offset",
    timestamp: new Date().toISOString(),
    subject: {
      source: args.input.source,
      messageId: args.input.messageId,
      operatorRef: args.input.operatorRef,
    },
    refs: {
      model: args.input.usage?.model || "unknown",
      provider: args.input.usage?.provider || "unknown",
      retirementId: args.retirement?.retirementId,
      deepLink: args.retirement?.deepLink,
    },
    claims: {
      usage: {
        totalTokens: args.estimate.totalTokens,
        promptTokens: args.input.usage?.promptTokens,
        completionTokens: args.input.usage?.completionTokens,
      },
      compute: {
        inferredComputeHours: args.estimate.inferredComputeHours,
      },
      carbon: {
        estimatedKgCO2: args.estimate.estimatedKgCO2,
        estimatedCostUSD: args.estimate.estimatedCostUSD,
      },
      retirement: args.retirement || { success: false, status: "not_attempted" },
    },
  };
}

export async function processRegenComputeOffset(
  input: RegenComputeOffsetInput
): Promise<RegenComputeOffsetResult> {
  const enabled = shouldEnableComputeOffset();
  if (!enabled) {
    return {
      ok: true,
      enabled: false,
      attemptedRetire: false,
    };
  }

  const totalTokens = resolveTotalTokens(input.usage);
  if (totalTokens <= 0) {
    return {
      ok: true,
      enabled: true,
      attemptedRetire: false,
      error: "no_usage_tokens",
    };
  }

  const tokensPerHour = envNumber("REGEN_COMPUTE_TOKENS_PER_HOUR", 180_000);
  const inferredComputeHours = Math.max(0.0001, totalTokens / Math.max(1, tokensPerHour));
  const carbon = estimateAIComputeCarbon(inferredComputeHours, resolveModelSize());
  const estimate = {
    totalTokens,
    inferredComputeHours: round(inferredComputeHours, 6),
    estimatedKgCO2: carbon.estimatedKgCO2,
    estimatedCostUSD: carbon.estimatedCostUSD,
  };

  const shouldRetire =
    shouldAutoRetire() &&
    input.allowRetire !== false &&
    input.source !== "telegram";
  let retirement:
    | {
        success: boolean;
        retirementId?: string;
        status?: string;
        deepLink?: string;
        amountUsd?: number;
        error?: string;
      }
    | undefined;

  if (shouldRetire) {
    const projectId = envString("REGEN_COMPUTE_PROJECT_ID");
    const beneficiaryName = envString("REGEN_COMPUTE_BENEFICIARY_NAME");
    const token = envString("REGEN_COMPUTE_TOKEN") || "USDC";
    const chain = envString("REGEN_COMPUTE_CHAIN") || "base";
    const minUsd = envNumber("REGEN_COMPUTE_MIN_RETIRE_USD", 1);
    const retireUsd = Math.max(minUsd, carbon.estimatedCostUSD);

    if (!projectId || !beneficiaryName) {
      retirement = {
        success: false,
        error: "missing_project_or_beneficiary",
      };
    } else {
      try {
        const response = await initiateRetirement({
          projectId,
          amount: round(retireUsd, 2),
          token,
          chain,
          beneficiaryName,
          retirementReason: "AI inference carbon offset (auto)",
          metadata: {
            source: input.source,
            messageId: input.messageId,
            operatorRef: input.operatorRef,
            usage: {
              totalTokens: estimate.totalTokens,
              promptTokens: input.usage?.promptTokens,
              completionTokens: input.usage?.completionTokens,
              model: input.usage?.model,
              provider: input.usage?.provider,
            },
            compute: {
              inferredComputeHours: estimate.inferredComputeHours,
              tokensPerHour,
            },
          },
        });
        retirement = {
          success: true,
          retirementId: response.retirementId,
          status: response.status,
          deepLink: response.deepLink,
          amountUsd: round(retireUsd, 2),
        };
      } catch (error) {
        retirement = {
          success: false,
          error: error instanceof Error ? error.message : "retire_failed",
        };
      }
    }
  }

  const proofPayload = buildProofPayload({ input, estimate, retirement });
  const proof = registerProofArtifact(proofPayload, {
    sourceRoute: input.source === "telegram" ? "/api/telegram/webhook" : "/operator",
    action: "regen.compute.offset",
    resultSummary:
      retirement?.success
        ? `retired:${retirement.retirementId || "ok"}`
        : shouldRetire
        ? `retire_failed:${retirement?.error || "unknown"}`
        : "estimate_only",
  });

  return {
    ok: true,
    enabled: true,
    attemptedRetire: shouldRetire,
    estimate,
    retirement,
    proof: proof || undefined,
  };
}
