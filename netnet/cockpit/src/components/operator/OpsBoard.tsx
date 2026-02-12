"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import styles from "@/components/operator/OperatorSeat.module.css";
import Tooltip from "@/components/operator/Tooltip";
import {
  fetchBankrTokenInfoSnapshot,
  fetchBankrWalletSnapshot,
  type BankrTokenInfoParams,
} from "@/app/operator/actions";
import type { Strategy } from "@/lib/operator/strategy";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";

type OpsBoardProps = {
  proposals: SkillProposalEnvelope[];
  messages: MessageEnvelope[];
  strategies: Strategy[];
  policyMode: string;
};

type SectionKey =
  | "strategies"
  | "activeStrategies"
  | "pendingApprovals"
  | "inProgress"
  | "recentExecutions"
  | "policyMode"
  | "pnl"
  | "bankrReadOnly";

const DEFAULT_SECTIONS: Record<SectionKey, boolean> = {
  strategies: true,
  activeStrategies: true,
  pendingApprovals: true,
  inProgress: true,
  recentExecutions: true,
  policyMode: true,
  pnl: true,
  bankrReadOnly: true,
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

export default function OpsBoard({ proposals, messages, strategies, policyMode }: OpsBoardProps) {
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
                <input
                  className={styles["nn-bankrInput"]}
                  value={tokenQuery.chain || ""}
                  onChange={(event) =>
                    setTokenQuery((prev) => ({ ...prev, chain: event.target.value }))
                  }
                />
              </label>
              <label className={styles["nn-muted"]}>
                token
                <input
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
