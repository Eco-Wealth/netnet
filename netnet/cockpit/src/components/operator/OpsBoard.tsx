"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import styles from "@/components/operator/OperatorSeat.module.css";
import type { Strategy } from "@/lib/operator/strategy";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";

type OpsBoardProps = {
  proposals: SkillProposalEnvelope[];
  messages: MessageEnvelope[];
  strategies: Strategy[];
  policyMode: string;
};

type SectionKey =
  | "activeStrategies"
  | "pendingApprovals"
  | "inProgress"
  | "recentExecutions"
  | "policyMode"
  | "pnl";

const DEFAULT_SECTIONS: Record<SectionKey, boolean> = {
  activeStrategies: true,
  pendingApprovals: true,
  inProgress: true,
  recentExecutions: true,
  policyMode: true,
  pnl: true,
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

  const activeStrategies = useMemo(
    () =>
      strategies.filter(
        (strategy) =>
          strategy.status === "active" || strategy.status === "completed" || strategy.status === "paused"
      ),
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

  return (
    <div className={styles["nn-columnBody"]}>
      <div className={styles["nn-sectionHeader"]}>
        <div className={styles["nn-sectionTitle"]}>Live Ops Board</div>
        <div className={styles["nn-muted"]}>Reactive state</div>
      </div>

      <div className={styles["nn-opsBoard"]}>
        <Section
          title="Active Strategies"
          open={sections.activeStrategies}
          onToggle={() => toggle("activeStrategies")}
        >
          {activeStrategies.length ? (
            activeStrategies.map((strategy) => (
              <div key={strategy.id} className={styles["nn-listItem"]}>
                <div>{strategy.name}</div>
                <div className={styles["nn-muted"]}>{strategy.description}</div>
                <div className={styles["nn-muted"]}>
                  status: {strategy.status} · linked proposals: {strategy.linkedProposalIds.length}
                </div>
              </div>
            ))
          ) : (
            <div className={styles["nn-muted"]}>No active strategies yet.</div>
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
                <div>{proposal.skillId}</div>
                <div className={styles["nn-muted"]}>{proposal.route}</div>
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
      </div>
    </div>
  );
}
