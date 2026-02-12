"use client";

import { useMemo, useState } from "react";
import { Button, Input } from "@/components/ui";
import styles from "@/components/operator/OperatorSeat.module.css";
import Tooltip from "@/components/operator/Tooltip";
import {
  fetchBankrTokenInfoSnapshot,
  fetchBankrWalletSnapshot,
  type BankrTokenInfoParams,
} from "@/app/operator/actions";
import {
  listBankrTemplates,
  type BankrTemplateId,
} from "@/lib/operator/templates/bankr";
import type { Strategy } from "@/lib/operator/strategy";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";

type OpsBoardProps = {
  proposals: SkillProposalEnvelope[];
  messages: MessageEnvelope[];
  strategies: Strategy[];
  policyMode: string;
  onCreateDraftProposal: (
    templateId: string,
    input: Record<string, string>
  ) => Promise<void>;
};

type SectionKey =
  | "bankrQuickActions"
  | "strategies"
  | "activeStrategies"
  | "pendingApprovals"
  | "inProgress"
  | "recentExecutions"
  | "policyMode"
  | "pnl"
  | "bankrReadOnly";

const DEFAULT_SECTIONS: Record<SectionKey, boolean> = {
  bankrQuickActions: true,
  strategies: true,
  activeStrategies: true,
  pendingApprovals: true,
  inProgress: true,
  recentExecutions: true,
  policyMode: true,
  pnl: true,
  bankrReadOnly: true,
};

const BANKR_TEMPLATE_FIELDS: Record<
  BankrTemplateId,
  Array<{ key: string; label: string; placeholder: string }>
> = {
  bankr_dca: [
    { key: "token", label: "token", placeholder: "ECO" },
    { key: "amount", label: "amount", placeholder: "100" },
    { key: "cadence", label: "cadence", placeholder: "daily" },
    { key: "venue", label: "venue", placeholder: "bankr" },
  ],
  bankr_lp_probe: [
    { key: "pair", label: "pair", placeholder: "ECO/USDC" },
    { key: "amount", label: "amount", placeholder: "200" },
    { key: "feeTier", label: "fee tier", placeholder: "0.3%" },
    { key: "range", label: "range", placeholder: "balanced" },
    { key: "venue", label: "venue", placeholder: "bankr" },
  ],
  bankr_rebalance: [
    { key: "portfolio", label: "portfolio", placeholder: "treasury" },
    { key: "target", label: "target", placeholder: "40/40/20" },
    { key: "constraints", label: "constraints", placeholder: "policy caps" },
  ],
  bankr_wallet_snapshot: [
    { key: "wallet", label: "wallet", placeholder: "0x..." },
  ],
};

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={styles["nn-collapsible"]}>
      <div className={styles["nn-collapseHeader"]}>
        <div className={styles["nn-sectionTitle"]}>{title}</div>
        <Button size="sm" variant="subtle" onClick={onToggle}>
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      {open ? <div className={styles["nn-collapseBody"]}>{children}</div> : null}
    </section>
  );
}

export default function OpsBoard({
  proposals,
  messages,
  strategies,
  policyMode,
  onCreateDraftProposal,
}: OpsBoardProps) {
  const [sections, setSections] = useState<Record<SectionKey, boolean>>(DEFAULT_SECTIONS);
  const [expandedProposals, setExpandedProposals] = useState<Record<string, boolean>>({});
  const [walletBusy, setWalletBusy] = useState(false);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [walletSnapshot, setWalletSnapshot] = useState<any | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletUpdatedAt, setWalletUpdatedAt] = useState<number | null>(null);
  const [tokenSnapshot, setTokenSnapshot] = useState<any | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenUpdatedAt, setTokenUpdatedAt] = useState<number | null>(null);
  const [tokenQuery, setTokenQuery] = useState<BankrTokenInfoParams>({
    chain: "base",
    token: "USDC",
  });
  const templates = useMemo(() => listBankrTemplates(), []);
  const [selectedTemplate, setSelectedTemplate] = useState<BankrTemplateId>(
    () => templates[0]?.id ?? "bankr_dca"
  );
  const [templateInput, setTemplateInput] = useState<Record<string, string>>({});
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<string>("");
  const selectedTemplateDef = useMemo(
    () => templates.find((template) => template.id === selectedTemplate) || null,
    [templates, selectedTemplate]
  );

  const activeStrategies = useMemo(
    () =>
      strategies.filter(
        (strategy) => strategy.status === "active" || strategy.status === "paused"
      ),
    [strategies]
  );
  const draftStrategies = useMemo(
    () => strategies.filter((strategy) => strategy.status === "draft"),
    [strategies]
  );

  const pendingApprovals = useMemo(
    () => proposals.filter((proposal) => proposal.status === "draft"),
    [proposals]
  );

  const inProgress = useMemo(
    () => proposals.filter((proposal) => proposal.executionStatus === "running"),
    [proposals]
  );

  const recentExecutions = useMemo(() => {
    return proposals
      .filter((proposal) => proposal.executionStatus === "completed" || proposal.executionStatus === "failed")
      .sort((a, b) => (b.executionCompletedAt || 0) - (a.executionCompletedAt || 0))
      .slice(0, 5);
  }, [proposals]);

  const lastAudit = useMemo(() => {
    return [...messages]
      .filter((message) => message.role === "skill" || message.role === "assistant")
      .sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [messages]);

  function toggle(section: SectionKey) {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function toggleProposal(id: string) {
    setExpandedProposals((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function requiredFields(templateId: BankrTemplateId) {
    return BANKR_TEMPLATE_FIELDS[templateId] || [];
  }

  function onTemplateFieldChange(key: string, value: string) {
    setTemplateInput((prev) => ({ ...prev, [key]: value }));
  }

  async function draftTemplateProposal() {
    setTemplateBusy(true);
    setTemplateNotice("");
    try {
      await onCreateDraftProposal(selectedTemplate, templateInput);
      setTemplateNotice("Draft proposal created.");
    } catch {
      setTemplateNotice("Couldn't create draft proposal.");
    } finally {
      setTemplateBusy(false);
    }
  }

  function formatSnapshot(value: unknown): string {
    const seen = new WeakSet<object>();
    return (
      JSON.stringify(
      value,
      (_key, current) => {
        if (typeof current === "string" && current.length > 180) {
          return `${current.slice(0, 180)}...`;
        }
        if (current && typeof current === "object") {
          if (seen.has(current)) return "[circular]";
          seen.add(current);
        }
        return current;
      },
      2
      ) ?? "null"
    );
  }

  function formatTime(timestamp: number | null): string {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  async function refreshWallet() {
    setWalletBusy(true);
    setWalletError(null);
    try {
      const result = await fetchBankrWalletSnapshot();
      if (!result.ok) {
        setWalletSnapshot(null);
        setWalletError(result.error || "wallet_unavailable");
        return;
      }
      setWalletSnapshot(result.data ?? null);
      setWalletUpdatedAt(Date.now());
    } finally {
      setWalletBusy(false);
    }
  }

  async function refreshTokenInfo() {
    setTokenBusy(true);
    setTokenError(null);
    try {
      const result = await fetchBankrTokenInfoSnapshot({
        chain: tokenQuery.chain || "base",
        token: tokenQuery.token || "USDC",
      });
      if (!result.ok) {
        setTokenSnapshot(null);
        setTokenError(result.error || "token_info_unavailable");
        return;
      }
      setTokenSnapshot(result.data ?? null);
      setTokenUpdatedAt(Date.now());
    } finally {
      setTokenBusy(false);
    }
  }

  function strategyStatusHelp(status: Strategy["status"]): string {
    if (status === "draft") return "Draft strategy: planning stage, not actively tracked yet.";
    if (status === "active") return "Active strategy: currently being executed through linked proposals.";
    if (status === "paused") return "Paused strategy: temporarily on hold by operator choice.";
    return "Archived strategy: kept for historical context only.";
  }

  function openStrategyLink(strategy: Strategy) {
    if (typeof document === "undefined") return;
    if (strategy.linkedMessageId) {
      const target = document.getElementById(`operator-message-${strategy.linkedMessageId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    const conversationRoot = document.getElementById("operator-conversation-root");
    if (conversationRoot) {
      conversationRoot.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className={[styles["nn-columnBody"], styles.panelBody].join(" ")}>
      <div className={[styles["nn-sectionHeader"], styles.panelHeader].join(" ")}>
        <div className={styles["nn-sectionTitle"]}>Live Ops Board</div>
        <div className={styles["nn-muted"]}>Reactive state</div>
      </div>

      <div className={styles["nn-summaryBadges"]}>
        <span className={styles["nn-statusBadge"]}>Policy: {policyMode}</span>
        <span className={styles["nn-statusBadge"]}>Pending: {pendingApprovals.length}</span>
        <span className={styles["nn-statusBadge"]}>Running: {inProgress.length}</span>
      </div>

      <div className={styles["nn-opsBoard"]}>
        <Section
          title="Bankr Quick Actions"
          open={sections.bankrQuickActions}
          onToggle={() => toggle("bankrQuickActions")}
        >
          <div className={styles["nn-listItem"]}>
            <label className={styles["nn-muted"]}>
              template
              <select
                className={styles["nn-templateSelect"]}
                value={selectedTemplate}
                onChange={(event) => {
                  setSelectedTemplate(event.target.value as BankrTemplateId);
                  setTemplateNotice("");
                }}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles["nn-templateFields"]}>
              {requiredFields(selectedTemplate).map((field) => (
                <label key={field.key} className={styles["nn-muted"]}>
                  {field.label}
                  <Input
                    value={templateInput[field.key] || ""}
                    onChange={(event) =>
                      onTemplateFieldChange(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                  />
                </label>
              ))}
            </div>
            {selectedTemplateDef ? (
              <div className={styles["nn-muted"]}>{selectedTemplateDef.summary}</div>
            ) : null}

            <Tooltip text="Creates a proposal you must approve before anything can run.">
              <span>
                <Button
                  size="sm"
                  onClick={draftTemplateProposal}
                  disabled={templateBusy}
                >
                  {templateBusy ? "Drafting..." : "Draft Proposal"}
                </Button>
              </span>
            </Tooltip>
            {templateNotice ? (
              <div className={styles["nn-muted"]}>{templateNotice}</div>
            ) : null}
          </div>
        </Section>

        <Section title="Strategies" open={sections.strategies} onToggle={() => toggle("strategies")}>
          {draftStrategies.length ? (
            draftStrategies.map((strategy) => (
              <div key={strategy.id} className={styles["nn-listItem"]}>
                <div className={styles["nn-listHead"]}>
                  <div>
                    <div>{strategy.title}</div>
                    <div className={styles["nn-muted"]}>
                      kind: {strategy.kind} · status: {strategy.status}
                    </div>
                  </div>
                  <Button size="sm" variant="subtle" onClick={() => openStrategyLink(strategy)}>
                    Open
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles["nn-muted"]}>No strategies yet.</div>
          )}
        </Section>

        <Section
          title="Active Strategies"
          open={sections.activeStrategies}
          onToggle={() => toggle("activeStrategies")}
        >
          {activeStrategies.length ? (
            activeStrategies.map((strategy) => (
              <div key={strategy.id} className={styles["nn-listItem"]}>
                <div>{strategy.title}</div>
                <div className={styles["nn-muted"]}>{strategy.notes || "No notes provided."}</div>
                <div className={styles["nn-chipRow"]}>
                  <Tooltip text={strategyStatusHelp(strategy.status)}>
                    <span className={styles["nn-statusBadge"]}>status: {strategy.status}</span>
                  </Tooltip>
                  <span className={styles["nn-muted"]}>
                    linked proposal: {strategy.linkedProposalId || "none"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles["nn-muted"]}>
              No active strategies.
              <br />
              Propose a plan to begin tracking one.
            </div>
          )}
        </Section>

        <Section
          title="Pending Approvals"
          open={sections.pendingApprovals}
          onToggle={() => toggle("pendingApprovals")}
        >
          {pendingApprovals.length ? (
            pendingApprovals.map((proposal) => (
              <div key={proposal.id} className={styles["nn-listItem"]}>
                <div className={styles["nn-listHead"]}>
                  <div>
                    <div>{proposal.skillId}</div>
                    <div className={styles["nn-muted"]}>{proposal.route}</div>
                  </div>
                  <Button size="sm" variant="subtle" onClick={() => toggleProposal(proposal.id)}>
                    {expandedProposals[proposal.id] ? "Less" : "Details"}
                  </Button>
                </div>
                <div className={styles["nn-chipRow"]}>
                  <span className={styles["nn-chip"]}>status: {proposal.status}</span>
                  <span className={styles["nn-chip"]}>intent: {proposal.executionIntent}</span>
                  <span className={styles["nn-chip"]}>risk: {proposal.riskLevel}</span>
                </div>
                {expandedProposals[proposal.id] ? (
                  <div className={styles["nn-previewBlock"]}>
                    <div className={styles["nn-muted"]}>{proposal.reasoning}</div>
                    <pre>{JSON.stringify(proposal.proposedBody, null, 2)}</pre>
                  </div>
                ) : (
                  <div className={styles["nn-muted"]}>
                    {proposal.reasoning.slice(0, 72)}
                    {proposal.reasoning.length > 72 ? "..." : ""}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={styles["nn-muted"]}>No draft proposals waiting for approval.</div>
          )}
        </Section>

        <Section title="Execution In Progress" open={sections.inProgress} onToggle={() => toggle("inProgress")}>
          {inProgress.length ? (
            inProgress.map((proposal) => (
              <div key={proposal.id} className={styles["nn-listItem"]}>
                <div>{proposal.skillId}</div>
                <div className={styles["nn-muted"]}>running {proposal.route}</div>
              </div>
            ))
          ) : (
            <div className={styles["nn-muted"]}>No executions in progress.</div>
          )}
        </Section>

        <Section
          title="Recent Executions"
          open={sections.recentExecutions}
          onToggle={() => toggle("recentExecutions")}
        >
          {recentExecutions.length ? (
            recentExecutions.map((proposal) => (
              <div key={proposal.id} className={styles["nn-listItem"]}>
                <div>{proposal.skillId}</div>
                <div className={styles["nn-muted"]}>
                  {proposal.executionStatus} · {proposal.executionResult?.route || proposal.route}
                </div>
              </div>
            ))
          ) : (
            <div className={styles["nn-muted"]}>No completed executions yet.</div>
          )}
        </Section>

        <Section title="Policy Mode" open={sections.policyMode} onToggle={() => toggle("policyMode")}>
          <div className={styles["nn-listItem"]}>
            <div>Current mode: {policyMode}</div>
            <div className={styles["nn-muted"]}>Execution remains gate-checked at runtime.</div>
          </div>
          {lastAudit ? (
            <div className={styles["nn-listItem"]}>
              <div>Latest audit message</div>
              <div className={styles["nn-muted"]}>{lastAudit.content.slice(0, 140)}</div>
            </div>
          ) : null}
        </Section>

        <Section title="PnL Snapshot" open={sections.pnl} onToggle={() => toggle("pnl")}>
          <div className={styles["nn-listItem"]}>
            <div>24h PnL: --</div>
            <div className={styles["nn-muted"]}>placeholder · finance adapters not connected in this unit</div>
          </div>
          <div className={styles["nn-listItem"]}>
            <div>Active risk budget: --</div>
            <div className={styles["nn-muted"]}>placeholder · set by policy layer</div>
          </div>
        </Section>

        <Section
          title="Bankr (read-only)"
          open={sections.bankrReadOnly}
          onToggle={() => toggle("bankrReadOnly")}
        >
          <div className={styles["nn-listItem"]}>
            <div className={styles["nn-listHead"]}>
              <div>
                <div>Wallet snapshot</div>
                <div className={styles["nn-muted"]}>Last refresh: {formatTime(walletUpdatedAt)}</div>
              </div>
              <Button size="sm" variant="subtle" onClick={refreshWallet} disabled={walletBusy}>
                {walletBusy ? "Refreshing..." : "Refresh Wallet"}
              </Button>
            </div>

            {walletError ? (
              <div className={styles["nn-muted"]}>Couldn't load (policy or missing config).</div>
            ) : walletSnapshot ? (
              <pre className={styles["nn-jsonBlock"]}>{formatSnapshot(walletSnapshot)}</pre>
            ) : (
              <div className={styles["nn-muted"]}>No snapshot yet - click refresh.</div>
            )}
          </div>

          <div className={styles["nn-listItem"]}>
            <div className={styles["nn-listHead"]}>
              <div>
                <div>Token info snapshot</div>
                <div className={styles["nn-muted"]}>Last refresh: {formatTime(tokenUpdatedAt)}</div>
              </div>
              <Button size="sm" variant="subtle" onClick={refreshTokenInfo} disabled={tokenBusy}>
                {tokenBusy ? "Refreshing..." : "Refresh Token Info"}
              </Button>
            </div>

            <div className={styles["nn-bankrParams"]}>
              <label className={styles["nn-muted"]}>
                chain
                <Input
                  className={styles["nn-bankrInput"]}
                  value={tokenQuery.chain || ""}
                  onChange={(event) =>
                    setTokenQuery((prev) => ({ ...prev, chain: event.target.value }))
                  }
                />
              </label>
              <label className={styles["nn-muted"]}>
                token
                <Input
                  className={styles["nn-bankrInput"]}
                  value={tokenQuery.token || ""}
                  onChange={(event) =>
                    setTokenQuery((prev) => ({ ...prev, token: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className={styles["nn-muted"]}>
              If token info requires params in your environment, set chain/token above and refresh.
            </div>

            {tokenError ? (
              <div className={styles["nn-muted"]}>Couldn't load (policy or missing config).</div>
            ) : tokenSnapshot ? (
              <pre className={styles["nn-jsonBlock"]}>{formatSnapshot(tokenSnapshot)}</pre>
            ) : (
              <div className={styles["nn-muted"]}>No snapshot yet - click refresh.</div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
