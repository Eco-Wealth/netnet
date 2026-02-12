export type OperatorStrategyTemplate = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  starterPrompt: string;
};

export const OPERATOR_STRATEGY_TEMPLATES: OperatorStrategyTemplate[] = [
  {
    id: "daily-treasury-routine",
    title: "Daily Treasury Routine (Bankr + LP)",
    description: "Review balances, route fees, and draft safe proposal packets for treasury moves.",
    tags: ["treasury", "bankr"],
    starterPrompt:
      "Review current treasury posture and propose skill JSON packets only (no execution) for Bankr wallet checks, token action planning, and LP-aware fee routing.",
  },
  {
    id: "weekly-ops-review",
    title: "Weekly Ops Review (Work + Proof)",
    description: "Create an operator-ready weekly review across work queues and proof outputs.",
    tags: ["ops", "proof"],
    starterPrompt:
      "Draft a weekly operations review and propose skill JSON packets only (no execution) for work queue updates and proof feed generation.",
  },
  {
    id: "carbon-retirement-proposal",
    title: "Carbon Retirement Proposal",
    description: "Build a retirement proposal with risk notes and required approvals.",
    tags: ["carbon", "retire"],
    starterPrompt:
      "Generate a carbon retirement proposal packet as skill JSON only (no execution), including assumptions, required approvals, and expected proof output.",
  },
  {
    id: "regen-registry-packet",
    title: "Regen Registry Project Packet Draft",
    description: "Produce a registry-ready regenerative project packet in proposal mode.",
    tags: ["regen", "registry"],
    starterPrompt:
      "Propose a Regen Registry project packet using structured skill proposal JSON only (no execution), including a draft payload and risk level.",
  },
  {
    id: "security-audit-pass",
    title: "Security Audit Pass (No Changes)",
    description: "Run a non-invasive audit pass and report findings without making changes.",
    tags: ["security", "audit"],
    starterPrompt:
      "Propose skill JSON packets only (no execution) for a read-only security audit pass and summarize likely risks with proof-of-action expectations.",
  },
  {
    id: "revenue-loop-readout",
    title: "Revenue Loop Readout",
    description: "Summarize economics loops and propose next safe operator actions.",
    tags: ["revenue", "economics"],
    starterPrompt:
      "Prepare a revenue loop readout and propose skill JSON packets only (no execution) for revenue and economics routes.",
  },
  {
    id: "repo-development-plan",
    title: "Repo Development Plan (30 Units)",
    description: "Generate a phased unit plan grounded in policy and contract safety.",
    tags: ["dev", "roadmap"],
    starterPrompt:
      "Draft a 30-unit development plan and propose skill JSON packets only (no execution) where APIs should be analyzed or validated.",
  },
  {
    id: "michelin-hiring-plan",
    title: "Michelin Restaurant Hiring Plan",
    description: "Draft a hiring operations strategy with safe, auditable action envelopes.",
    tags: ["restaurant", "hiring"],
    starterPrompt:
      "Create a restaurant hiring strategy brief and output proposal JSON packets only (no execution), including work and policy-safe coordination steps.",
  },
  {
    id: "vendor-outreach-followups",
    title: "Vendor Outreach + Follow-ups",
    description: "Structure outreach cadence and follow-up tasks for operator teams.",
    tags: ["outreach", "comms"],
    starterPrompt:
      "Design a vendor outreach workflow and propose skill JSON packets only (no execution) for work item creation and proof logging.",
  },
  {
    id: "operator-seat-ux-iteration",
    title: "Operator Seat UX Iteration Brief",
    description: "Generate concise UX iteration proposals for the operator cockpit.",
    tags: ["ux", "design"],
    starterPrompt:
      "Provide an Operator Seat UX iteration brief and output structured proposal JSON packets only (no execution) for implementation steps.",
  },
];
