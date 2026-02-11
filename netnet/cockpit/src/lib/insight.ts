export type InsightFields = {
  what: string;
  when?: string;
  requires?: string;
  output?: string;
};

export function toInsightTitle(insight: InsightFields): string {
  return [
    `What: ${insight.what}`,
    insight.when ? `When: ${insight.when}` : null,
    insight.requires ? `Requires: ${insight.requires}` : null,
    insight.output ? `Output: ${insight.output}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function defaultPrimaryInsightTitle(): string {
  return toInsightTitle({
    what: "Primary operator action",
    when: "Use after reviewing context and policy status",
    requires: "Operator approval if spend-adjacent. API/compute usage may apply.",
    output: "Action result and/or proof artifact",
  });
}
