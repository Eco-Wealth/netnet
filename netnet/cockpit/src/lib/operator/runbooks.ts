import type { StrategyInput } from "@/lib/operator/strategy";

export type RunbookSeed = {
  id: string;
  title: string;
  kind: StrategyInput["kind"];
  runbookMarkdown: string;
};

const RUNBOOK_SEEDS: RunbookSeed[] = [
  {
    id: "bankr-trading-ops",
    title: "Bankr Trading Ops",
    kind: "bankr",
    runbookMarkdown: `# Draft runbook: Bankr trading ops
Operator review required before acting on this runbook.

## Daily checks
- Confirm policy mode and spend limits before approving proposals.
- Verify wallet balances and token info snapshots for required assets.
- Review pending Bankr proposals for risk, route, and intent state.

## Proposal flow
1. Keep new ideas in draft until scope and risk are clear.
2. Approve only proposals with clear route and expected output.
3. Lock intent, generate plan, then execute only when policy allows.

## Stop conditions
- Pause activity if policy denies repeatedly.
- Escalate to operator review on failed or unexpected executions.
`,
  },
  {
    id: "michelin-restaurant-ops",
    title: "Michelin Restaurant Ops",
    kind: "ops",
    runbookMarkdown: `# Draft runbook: Michelin restaurant ops
Operator review required before acting on this runbook.

## Shift setup
- Review open work items and unresolved service incidents.
- Confirm staffing, reservations, and critical supply levels.
- Capture any compliance or safety exceptions before service starts.

## Service loop
1. Prioritize guest-impacting issues first.
2. Track execution notes in proposals and audit messages.
3. Close resolved items with clear handoff notes.

## Escalation rules
- Escalate any safety or payment issue immediately.
- Pause non-critical changes during peak service windows.
`,
  },
];

export function listDefaultRunbookSeeds(): RunbookSeed[] {
  return [...RUNBOOK_SEEDS];
}

export function buildDefaultRunbookStrategies(now = Date.now()): StrategyInput[] {
  return RUNBOOK_SEEDS.map((seed, index) => ({
    id: `strategy-seed-${seed.id}`,
    title: seed.title,
    kind: seed.kind,
    type: "standard",
    status: "draft",
    pinned: false,
    notes: "Draft runbook seeded for operator onboarding.",
    runbookMarkdown: seed.runbookMarkdown,
    createdAt: now + index,
    updatedAt: now + index,
  }));
}
