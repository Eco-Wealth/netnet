export type AutonomyLevel = "READ_ONLY" | "PROPOSE_ONLY" | "EXECUTE_WITH_LIMITS";

export type StrategyProgram = {
  id: string;
  name: string;
  description: string;
  autonomyDefault: AutonomyLevel;
  tags: string[];
  steps: Array<{
    id: string;
    kind: "trade" | "retire" | "token_ops" | "verify" | "work";
    title: string;
    summary: string;
    endpoint?: string; // API route for proposal/execution
    method?: "GET" | "POST";
    bodyExample?: unknown;
    producesProof?: boolean;
  }>;
};

export const STRATEGY_PROGRAMS: StrategyProgram[] = [
  {
    id: "loop.micro-retire",
    name: "Micro-Retire Loop",
    description:
      "Use realized fees / treasury buffer to plan small retirements with operator approval; emits proof objects for each step.",
    autonomyDefault: "PROPOSE_ONLY",
    tags: ["carbon", "proofs", "economics"],
    steps: [
      {
        id: "estimate",
        kind: "retire",
        title: "Estimate retirement amount",
        summary: "Compute suggested retire amount based on policy + fee routing rules.",
        endpoint: "/api/agent/carbon?action=estimate",
        method: "GET",
        producesProof: false,
      },
      {
        id: "quote",
        kind: "retire",
        title: "Get quote",
        summary: "Fetch a retirement quote (non-binding) via bridge routes.",
        endpoint: "/api/agent/carbon?action=quote",
        method: "GET",
        producesProof: false,
      },
      {
        id: "propose",
        kind: "retire",
        title: "Propose retirement",
        summary: "Create an operator-approval packet; does not execute funds movement.",
        endpoint: "/api/agent/carbon",
        method: "POST",
        bodyExample: { beneficiaryName: "EcoWealth", reason: "micro-retire", mode: "PROPOSE" },
        producesProof: true,
      },
    ],
  },
  {
    id: "trade.dryrun",
    name: "Trade Plan (Dry Run)",
    description:
      "Generate a capped, allowlist-enforced plan in DRY_RUN mode; no on-chain execution.",
    autonomyDefault: "PROPOSE_ONLY",
    tags: ["trading", "safety"],
    steps: [
      {
        id: "info",
        kind: "trade",
        title: "Inspect policy",
        summary: "Read caps/allowlists and next actions.",
        endpoint: "/api/agent/trade?action=info",
        method: "GET",
      },
      {
        id: "quote",
        kind: "trade",
        title: "Simulate quote",
        summary: "Generate a quote and executionPlan (DRY_RUN).",
        endpoint: "/api/agent/trade?action=quote",
        method: "GET",
      },
    ],
  },
  {
    id: "token.launch.propose",
    name: "Token Ops (Propose Only)",
    description:
      "Create proposals for Bankr token operations (launch/manage/fee routing) with proof-of-action outputs.",
    autonomyDefault: "PROPOSE_ONLY",
    tags: ["bankr", "token", "fees"],
    steps: [
      {
        id: "catalog",
        kind: "token_ops",
        title: "List token actions",
        summary: "Discover supported token actions and required fields.",
        endpoint: "/api/bankr/token/actions",
        method: "GET",
      },
      {
        id: "propose",
        kind: "token_ops",
        title: "Propose token action",
        summary: "Create a proposal + proof object; requires approval to execute.",
        endpoint: "/api/bankr/token/actions",
        method: "POST",
        bodyExample: { action: "fee_routing.update", params: { recipient: "treasury", bps: 250 } },
        producesProof: true,
      },
    ],
  },
];
