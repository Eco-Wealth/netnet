"use client";

import { useMemo } from "react";
import styles from "@/components/operator/OperatorSeat.module.css";
import type { Strategy } from "@/lib/operator/strategy";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";

export type OperatorInspectorSelection = {
  kind: "proposal" | "execution" | "strategy" | "message" | "none";
  id?: string;
};

type InspectorPanelProps = {
  selected: OperatorInspectorSelection;
  data: {
    proposals: SkillProposalEnvelope[];
    messages: MessageEnvelope[];
    strategies: Strategy[];
  };
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Unable to render JSON.";
  }
}

function formatTimestamp(value: number | undefined): string {
  if (!value) return "n/a";
  return new Date(value).toLocaleString();
}

export default function InspectorPanel({ selected, data }: InspectorPanelProps) {
  const proposal = useMemo(
    () =>
      selected.kind === "proposal" && selected.id
        ? data.proposals.find((entry) => entry.id === selected.id) ?? null
        : null,
    [data.proposals, selected]
  );

  const executionProposal = useMemo(
    () =>
      selected.kind === "execution" && selected.id
        ? data.proposals.find((entry) => entry.id === selected.id) ?? null
        : null,
    [data.proposals, selected]
  );

  const strategy = useMemo(
    () =>
      selected.kind === "strategy" && selected.id
        ? data.strategies.find((entry) => entry.id === selected.id) ?? null
        : null,
    [data.strategies, selected]
  );

  const message = useMemo(
    () =>
      selected.kind === "message" && selected.id
        ? data.messages.find((entry) => entry.id === selected.id) ?? null
        : null,
    [data.messages, selected]
  );

  return (
    <div className={[styles["nn-columnBody"], styles.panelBody].join(" ")}>
      <div className={styles["nn-sectionHeader"]}>
        <div>
          <div className={styles["nn-sectionTitle"]}>Inspector</div>
          <div className={styles["nn-muted"]}>Selected context</div>
        </div>
      </div>

      <div className={styles["nn-inspectorBody"]}>
        {selected.kind === "none" || !selected.id ? (
          <div className={styles["nn-emptyHint"]}>Select an item to inspect.</div>
        ) : null}

        {selected.kind === "proposal" ? (
          proposal ? (
            <>
              <div className={styles["nn-listItem"]}>
                <div className={styles["nn-listHead"]}>
                  <div>{proposal.skillId}</div>
                  <span className={styles["nn-statusBadge"]}>{proposal.status}</span>
                </div>
                <div className={styles["nn-muted"]}>route: {proposal.route}</div>
                <div className={styles["nn-muted"]}>risk: {proposal.riskLevel}</div>
                <div className={styles["nn-muted"]}>intent: {proposal.executionIntent}</div>
              </div>
              <pre className={styles["nn-jsonBlock"]}>{safeJson(proposal)}</pre>
            </>
          ) : (
            <div className={styles["nn-emptyHint"]}>Proposal not found.</div>
          )
        ) : null}

        {selected.kind === "execution" ? (
          executionProposal ? (
            <>
              <div className={styles["nn-listItem"]}>
                <div className={styles["nn-listHead"]}>
                  <div>{executionProposal.skillId}</div>
                  <span className={styles["nn-statusBadge"]}>
                    {executionProposal.executionStatus}
                  </span>
                </div>
                <div className={styles["nn-muted"]}>
                  started: {formatTimestamp(executionProposal.executionStartedAt)}
                </div>
                <div className={styles["nn-muted"]}>
                  completed: {formatTimestamp(executionProposal.executionCompletedAt)}
                </div>
                <div className={styles["nn-muted"]}>
                  result:{" "}
                  {executionProposal.executionResult
                    ? executionProposal.executionResult.ok
                      ? "success"
                      : "failed"
                    : executionProposal.executionError || "pending"}
                </div>
              </div>
              <pre className={styles["nn-jsonBlock"]}>
                {safeJson(
                  executionProposal.executionResult || {
                    error: executionProposal.executionError || "No execution result available.",
                  }
                )}
              </pre>
            </>
          ) : (
            <div className={styles["nn-emptyHint"]}>Execution context not found.</div>
          )
        ) : null}

        {selected.kind === "strategy" ? (
          strategy ? (
            <>
              <div className={styles["nn-listItem"]}>
                <div className={styles["nn-listHead"]}>
                  <div>{strategy.title}</div>
                  <span className={styles["nn-statusBadge"]}>{strategy.status}</span>
                </div>
                <div className={styles["nn-muted"]}>
                  {strategy.kind} · {strategy.type}
                </div>
                <div className={styles["nn-muted"]}>
                  updated: {new Date(strategy.updatedAt).toLocaleString()}
                </div>
              </div>
              {strategy.runbookMarkdown ? (
                <pre className={styles["nn-jsonBlock"]}>{strategy.runbookMarkdown}</pre>
              ) : null}
              <pre className={styles["nn-jsonBlock"]}>{safeJson(strategy)}</pre>
            </>
          ) : (
            <div className={styles["nn-emptyHint"]}>Strategy not found.</div>
          )
        ) : null}

        {selected.kind === "message" ? (
          message ? (
            <>
              <div className={styles["nn-listItem"]}>
                <div className={styles["nn-listHead"]}>
                  <div>{message.role}</div>
                  <span className={styles["nn-statusBadge"]}>
                    {message.metadata?.action || "message"}
                  </span>
                </div>
                <div className={styles["nn-muted"]}>
                  created: {new Date(message.createdAt).toLocaleString()}
                </div>
                <div className={styles["nn-muted"]}>
                  policy snapshot: {message.metadata?.policySnapshot ? "yes" : "no"}
                </div>
              </div>
              <pre className={styles["nn-jsonBlock"]}>{safeJson(message)}</pre>
            </>
          ) : (
            <div className={styles["nn-emptyHint"]}>Message not found.</div>
          )
        ) : null}
      </div>
    </div>
  );
}
