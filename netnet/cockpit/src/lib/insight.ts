export type InsightSpec = {
  what: string;
  when?: string;
  requires?: string;
  output?: string;
};

export function insightTitle(insight: InsightSpec): string {
  const parts = [
    `What: ${insight.what}`,
    insight.when ? `When: ${insight.when}` : null,
    insight.requires ? `Requires: ${insight.requires}` : null,
    insight.output ? `Output: ${insight.output}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

