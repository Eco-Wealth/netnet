import { createMessageId, type SkillProposalEnvelope } from "@/lib/operator/types";

export type BankrTemplateId =
  | "bankr_dca"
  | "bankr_lp_probe"
  | "bankr_rebalance"
  | "bankr_wallet_snapshot";

type BankrTemplateInfo = {
  id: BankrTemplateId;
  title: string;
  summary: string;
};

const TEMPLATE_LIST: BankrTemplateInfo[] = [
  {
    id: "bankr_dca",
    title: "Bankr DCA Plan",
    summary: "Draft a DCA proposal with token, amount, cadence, and venue constraints.",
  },
  {
    id: "bankr_lp_probe",
    title: "Bankr LP Probe Plan",
    summary: "Draft an LP probe proposal with pair, fee tier, range, and amount envelope.",
  },
  {
    id: "bankr_rebalance",
    title: "Bankr Rebalance Plan",
    summary: "Draft a rebalance proposal from target portfolio constraints.",
  },
  {
    id: "bankr_wallet_snapshot",
    title: "Bankr Wallet Snapshot (Plan)",
    summary: "Draft a read-only wallet snapshot proposal for the selected wallet.",
  },
];

function clean(value: string | undefined, fallback: string): string {
  const next = String(value || "").trim();
  return next || fallback;
}

export function listBankrTemplates(): {
  id: BankrTemplateId;
  title: string;
  summary: string;
}[] {
  return TEMPLATE_LIST.map((item) => ({ ...item }));
}

export function buildBankrProposalTemplate(
  id: BankrTemplateId,
  input: Record<string, string>
): SkillProposalEnvelope {
  const now = Date.now();
  const venue = clean(input.venue, "bankr");
  const action =
    id === "bankr_wallet_snapshot" ? "bankr.wallet.read" : "bankr.token.actions";

  const templateById: Record<
    BankrTemplateId,
    {
      title: string;
      route: string;
      riskLevel: SkillProposalEnvelope["riskLevel"];
      reasoning: string;
      proposedBody: Record<string, unknown>;
    }
  > = {
    bankr_dca: {
      title: "Bankr DCA Plan",
      route: "/api/bankr/token/actions",
      riskLevel: "medium",
      reasoning:
        `Plan a DCA workflow for ${clean(input.token, "ECO")} with ${clean(
          input.amount,
          "100"
        )} at ${clean(input.cadence, "daily")} cadence on ${venue}. ` +
        "This is proposal-only and must be approved before any execution path.",
      proposedBody: {
        action,
        templateId: id,
        mode: "dca",
        token: clean(input.token, "ECO"),
        amount: clean(input.amount, "100"),
        cadence: clean(input.cadence, "daily"),
        venue,
        operatorNotes:
          "Validate budget caps, slippage assumptions, and stop conditions before approval.",
      },
    },
    bankr_lp_probe: {
      title: "Bankr LP Probe Plan",
      route: "/api/bankr/token/actions",
      riskLevel: "medium",
      reasoning:
        `Plan an LP probe for ${clean(input.pair, "ECO/USDC")} using ${clean(
          input.amount,
          "200"
        )}, fee tier ${clean(input.feeTier, "0.3%")}, and range ${clean(
          input.range,
          "balanced"
        )} on ${venue}. ` +
        "This remains a draft proposal until explicitly approved.",
      proposedBody: {
        action,
        templateId: id,
        mode: "lp",
        pair: clean(input.pair, "ECO/USDC"),
        amount: clean(input.amount, "200"),
        feeTier: clean(input.feeTier, "0.3%"),
        range: clean(input.range, "balanced"),
        venue,
        operatorNotes:
          "Check concentration risk and impermanent loss tolerance before any execution intent.",
      },
    },
    bankr_rebalance: {
      title: "Bankr Rebalance Plan",
      route: "/api/bankr/token/actions",
      riskLevel: "medium",
      reasoning:
        `Plan a rebalance for ${clean(input.portfolio, "treasury")} toward ${clean(
          input.target,
          "target weights"
        )} with constraints ${clean(input.constraints, "policy caps")} on ${venue}. ` +
        "Only draft planning output should be produced at this stage.",
      proposedBody: {
        action,
        templateId: id,
        mode: "rebalance",
        portfolio: clean(input.portfolio, "treasury"),
        target: clean(input.target, "target weights"),
        constraints: clean(input.constraints, "policy caps"),
        venue,
        operatorNotes:
          "Require explicit operator review for drift thresholds and allocation changes.",
      },
    },
    bankr_wallet_snapshot: {
      title: "Bankr Wallet Snapshot (Plan)",
      route: "/api/bankr/wallet",
      riskLevel: "low",
      reasoning:
        `Plan a read-only Bankr wallet snapshot for ${clean(input.wallet, "default-wallet")} on ${venue}. ` +
        "No transaction execution is permitted in this workflow.",
      proposedBody: {
        action,
        templateId: id,
        wallet: clean(input.wallet, "default-wallet"),
        venue,
        operatorNotes:
          "Read-only snapshot for operator review and downstream proposal drafting.",
      },
    },
  };

  const template = templateById[id];

  return {
    id: createMessageId("proposal"),
    type: "skill.proposal",
    skillId: "bankr.agent",
    route: template.route,
    reasoning: template.reasoning,
    proposedBody: template.proposedBody,
    riskLevel: template.riskLevel,
    status: "draft",
    createdAt: now,
    executionIntent: "none",
    executionStatus: "idle",
  };
}
