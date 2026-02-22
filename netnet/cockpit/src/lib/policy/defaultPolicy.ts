import type { PolicyConfig, ProgramId } from "./types";

const nowIso = () => new Date().toISOString();

const defaultBudgets = {
  usdPerDay: 50,
  usdPerRun: 25,
  txPerDay: 10,
  inferenceUsdPerDay: 2,
  microRetireUsdPerDay: 1,
};

const defaultAnomalies = {
  maxFailuresInWindow: 3,
  windowSeconds: 10 * 60,
  maxSlippageBps: 150,
  maxGasUsd: 25,
  maxRetries: 2,
};

const baseAllow = {
  chains: ["base", "zora", "megaeth"],
  tokens: ["USDC", "ETH", "REGEN", "K2", "KVCM", "ECO", "ECO2", "KLIMA"],
  venues: ["uniswap", "aerodrome", "bankr", "bridge-eco", "klima", "zora", "kumbaya"],
};

export function getDefaultPolicy(): PolicyConfig {
  const mk = (id: ProgramId, name: string, autonomy: any, actions: any[]) => ({
    id,
    name,
    autonomy,
    budgets: { ...defaultBudgets },
    allow: { ...baseAllow, actions },
    anomalies: { ...defaultAnomalies },
  });

  return {
    version: "policy.v1",
    updatedAt: nowIso(),
    programs: {
      TRADING_LOOP: mk("TRADING_LOOP", "Trading loop", "PROPOSE_ONLY", [
        "trade.quote",
        "trade.plan",
        "fees.route",
        "proof.build",
        "work.create",
        "work.update",
      ]),
      TOKEN_OPS: mk("TOKEN_OPS", "Token operations", "PROPOSE_ONLY", [
        "bankr.wallet",
        "bankr.wallet.read",
        "bankr.token.info",
        "bankr.token.actions",
        "bankr.launch",
        "bankr.simulate",
        "bankr.plan",
        "bankr.quote",
        "bankr.token.read",
        "bankr.token.actions.plan",
        "zora.post.content",
        "kumbaya.post.content",
        "token.launch",
        "token.manage",
        "fees.route",
        "proof.build",
        "work.create",
        "work.update",
      ]),
      MICRO_RETIRE: mk("MICRO_RETIRE", "Micro retirements", "PROPOSE_ONLY", [
        "retire.quote",
        "retire.execute",
        "proof.build",
        "fees.route",
      ]),
      SDG_WORK: mk("SDG_WORK", "SDG work programs", "PROPOSE_ONLY", [
        "work.create",
        "work.update",
        "proof.build",
        "fees.route",
      ]),
      RESTAURANT_OPS: mk("RESTAURANT_OPS", "Restaurant ops", "PROPOSE_ONLY", [
        "work.create",
        "work.update",
        "proof.build",
        "fees.route",
      ]),
    },
  };
}
