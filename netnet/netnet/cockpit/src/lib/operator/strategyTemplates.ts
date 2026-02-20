import type { Strategy } from "@/lib/operator/strategy";
import { normalizeStrategy } from "@/lib/operator/strategy";
import { createMessageId } from "@/lib/operator/types";

export type BankrStrategyMode = "dca" | "lp" | "rebalance" | "market-make";

export type BuildBankrStrategyTemplateInput = {
  chain: string;
  pair: string;
  mode: BankrStrategyMode;
  riskUsdPerDay?: number;
  reason?: string;
};

export function buildBankrStrategyTemplate(
  input: BuildBankrStrategyTemplateInput
): Strategy {
  const now = Date.now();
  const chain = String(input.chain || "base").trim() || "base";
  const pair = String(input.pair || "ECO/USDC").trim() || "ECO/USDC";
  const mode = input.mode;
  const dailyRisk =
    typeof input.riskUsdPerDay === "number" && Number.isFinite(input.riskUsdPerDay)
      ? Math.max(1, input.riskUsdPerDay)
      : 50;
  const maxPosition = Math.max(1, Math.round(dailyRisk * 1.5));
  const cadenceHint =
    mode === "dca" ? "daily 9am" : mode === "rebalance" ? "hourly" : "daily 9am";

  const notes = [
    "objective:",
    `- Maintain ${pair} in ${mode} mode on ${chain} while preserving capital discipline.`,
    "",
    "constraints:",
    "- Proposal-only execution path. No direct trading from strategy draft.",
    "- Respect global policy gates and kill switches.",
    "",
    "risk limits:",
    `- max daily spend: ${dailyRisk} USD`,
    `- max position size: ${maxPosition} USD`,
    "",
    "cadence hint:",
    `- ${cadenceHint}`,
    "",
    "rollback / stop conditions:",
    "- Pause on policy deny, route errors, or unexpected slippage conditions.",
    "- Archive strategy when thesis is invalidated or risk envelope changes.",
  ].join("\n");

  return normalizeStrategy({
    id: createMessageId("strategy"),
    title: `Bankr: ${chain} ${pair} ${mode}`,
    kind: "bankr",
    status: "draft",
    notes: input.reason ? `${notes}\n\nreason:\n- ${input.reason}` : notes,
    scheduleHint: cadenceHint,
    createdAt: now,
    updatedAt: now,
  });
}
