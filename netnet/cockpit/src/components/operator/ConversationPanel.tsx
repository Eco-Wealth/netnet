"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import FirstRunTour from "@/components/operator/FirstRunTour";
import Tooltip from "@/components/operator/Tooltip";
import { Button, Textarea } from "@/components/ui";
import styles from "@/components/operator/OperatorSeat.module.css";
import type { ClarityLevel } from "@/lib/operator/clarity";
import type { SkillInfo } from "@/lib/operator/skillContext";
import type { OperatorStrategyTemplate } from "@/lib/operator/strategies";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";

type ConversationPanelProps = {
  messages: MessageEnvelope[];
  proposals: SkillProposalEnvelope[];
  draft: string;
  setDraft: (next: string) => void;
  onSend: () => void;
  loading: boolean;
  policyMode: string;
  clarity: ClarityLevel;
  skills: SkillInfo[];
  strategies: OperatorStrategyTemplate[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestIntent: (id: string) => void;
  onLockIntent: (id: string) => void;
  onGeneratePlan: (id: string) => void;
  onExecute: (id: string) => void;
  onDraftStrategy: (id: string) => void;
  onSelectProposal: (id: string) => void;
  onSelectMessage: (id: string) => void;
  selected:
    | { kind: "proposal"; id?: string }
    | { kind: "execution"; id?: string }
    | { kind: "strategy"; id?: string }
    | { kind: "message"; id?: string }
    | { kind: "none"; id?: string };
  loadingAction: string | null;
};

const MESSAGE_RENDER_STEP = 80;
const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatUsd(value: number): string {
  return USD_FORMATTER.format(value);
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdown(content: string): JSX.Element {
  const blocks: JSX.Element[] = [];
  const parts = content.split(/```([\s\S]*?)```/g);

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part) continue;

    if (i % 2 === 1) {
      blocks.push(
        <pre key={`code-${i}`}>
          <code>{part.trim()}</code>
        </pre>
      );
      continue;
    }

    const lines = part.split("\n");
    const buffer: string[] = [];

    const flushParagraph = (key: string) => {
      if (!buffer.length) return;
      const text = buffer.join(" ").trim();
      buffer.length = 0;
      if (!text) return;
      blocks.push(<p key={key} dangerouslySetInnerHTML={{ __html: renderInline(text) }} />);
    };

    for (let idx = 0; idx < lines.length; idx += 1) {
      const line = lines[idx].trim();
      if (!line) {
        flushParagraph(`p-${i}-${idx}`);
        continue;
      }

      if (line.startsWith("- ")) {
        flushParagraph(`p-${i}-${idx}-before-ul`);
        const items: string[] = [line.slice(2)];
        let cursor = idx + 1;
        while (cursor < lines.length && lines[cursor].trim().startsWith("- ")) {
          items.push(lines[cursor].trim().slice(2));
          cursor += 1;
        }
        blocks.push(
          <ul key={`ul-${i}-${idx}`}>
            {items.map((item, itemIndex) => (
              <li
                key={`uli-${i}-${idx}-${itemIndex}`}
                dangerouslySetInnerHTML={{ __html: renderInline(item) }}
              />
            ))}
          </ul>
        );
        idx = cursor - 1;
        continue;
      }

      if (/^\d+\.\s/.test(line)) {
        flushParagraph(`p-${i}-${idx}-before-ol`);
        const items: string[] = [line.replace(/^\d+\.\s/, "")];
        let cursor = idx + 1;
        while (cursor < lines.length && /^\d+\.\s/.test(lines[cursor].trim())) {
          items.push(lines[cursor].trim().replace(/^\d+\.\s/, ""));
          cursor += 1;
        }
        blocks.push(
          <ol key={`ol-${i}-${idx}`}>
            {items.map((item, itemIndex) => (
              <li
                key={`oli-${i}-${idx}-${itemIndex}`}
                dangerouslySetInnerHTML={{ __html: renderInline(item) }}
              />
            ))}
          </ol>
        );
        idx = cursor - 1;
        continue;
      }

      buffer.push(line);
    }

    flushParagraph(`p-${i}-tail`);
  }

  return <div className={styles["nn-markdown"]}>{blocks}</div>;
}

function modeForPolicy(policyMode: string): "READ" | "PROPOSE" | "EXECUTE" {
  if (policyMode === "READ_ONLY") return "READ";
  if (policyMode === "EXECUTE_WITH_LIMITS") return "EXECUTE";
  return "PROPOSE";
}

function roleClassName(role: MessageEnvelope["role"]): string {
  if (role === "operator") return styles["nn-messageOperator"];
  if (role === "assistant") return styles["nn-messageAssistant"];
  if (role === "skill") return styles["nn-messageSkill"];
  return styles["nn-messageSystem"];
}

function roleLabel(role: MessageEnvelope["role"], clarity: ClarityLevel): string {
  if (clarity === "pro") return "";
  if (role === "operator") return clarity === "beginner" ? "You" : "operator";
  if (role === "assistant") return clarity === "beginner" ? "Assistant" : "assistant";
  if (role === "skill") return clarity === "beginner" ? "Skill" : "skill";
  return clarity === "beginner" ? "System" : "system";
}

const ProposalInlineCard = memo(function ProposalInlineCard({
  proposal,
  isSelected,
  onSelectProposal,
  loadingAction,
  onApprove,
  onReject,
  onRequestIntent,
  onLockIntent,
  onGeneratePlan,
  onExecute,
  onDraftStrategy,
}: {
  proposal: SkillProposalEnvelope;
  isSelected: boolean;
  onSelectProposal: (id: string) => void;
  loadingAction: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestIntent: (id: string) => void;
  onLockIntent: (id: string) => void;
  onGeneratePlan: (id: string) => void;
  onExecute: (id: string) => void;
  onDraftStrategy: (id: string) => void;
}) {
  const [showJson, setShowJson] = useState(false);
  const canExecute =
    proposal.status === "approved" &&
    proposal.executionIntent === "locked" &&
    proposal.executionStatus === "idle" &&
    Boolean(proposal.executionPlan);

  const headlineStatus = useMemo(() => {
    if (proposal.executionStatus === "failed") return "failed";
    if (proposal.executionStatus === "completed") return "executed";
    if (
      proposal.status === "approved" &&
      proposal.executionIntent === "locked" &&
      proposal.executionStatus === "idle"
    ) {
      return "locked";
    }
    return proposal.status;
  }, [proposal.executionIntent, proposal.executionStatus, proposal.status]);

  const policyDecision = useMemo(() => {
    if (proposal.executionResult?.policyDecision) {
      return proposal.executionResult.policyDecision;
    }
    const metadataPolicy = proposal.metadata?.policyDecision;
    return typeof metadataPolicy === "string" && metadataPolicy.trim().length > 0
      ? metadataPolicy
      : "pending";
  }, [proposal.executionResult?.policyDecision, proposal.metadata]);

  const spendText = useMemo(() => {
    const body = proposal.proposedBody || {};
    const candidateValues = [body.amountUsd, body.spendUsd, body.maxSpendUsd];
    for (const candidate of candidateValues) {
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return formatUsd(candidate);
      }
    }
    return "none";
  }, [proposal.proposedBody]);

  const jsonView = useMemo(
    () =>
      JSON.stringify(
        {
          id: proposal.id,
          skillId: proposal.skillId,
          route: proposal.route,
          status: proposal.status,
          executionIntent: proposal.executionIntent,
          executionStatus: proposal.executionStatus,
          riskLevel: proposal.riskLevel,
          reasoning: proposal.reasoning,
          proposedBody: proposal.proposedBody,
          metadata: proposal.metadata,
          executionPlan: proposal.executionPlan,
          executionResult: proposal.executionResult,
          executionError: proposal.executionError,
        },
        null,
        2
      ),
    [proposal]
  );

  return (
    <div
      id={`operator-proposal-${proposal.id}`}
      data-proposal-id={proposal.id}
      className={[
        styles["nn-proposalCard"],
        isSelected ? styles["nn-selectedFrame"] : "",
      ].join(" ")}
      onClick={(event) => {
        event.stopPropagation();
        onSelectProposal(proposal.id);
      }}
    >
      <div className={styles["nn-proposalHead"]}>
        <div className={styles["nn-proposalHeaderMain"]}>
          <div className={styles["nn-proposalTitle"]}>Skill: {proposal.skillId || proposal.route}</div>
          <div className={styles["nn-proposalRoute"]}>{proposal.route}</div>
        </div>
        <div className={styles["nn-chipRow"]}>
          <span className={styles["nn-chip"]}>{headlineStatus}</span>
          <span className={styles["nn-chip"]}>exec: {proposal.executionStatus}</span>
        </div>
      </div>

      <div className={styles["nn-proposalPolicyLine"]}>
        Policy: {policyDecision} | Risk: {proposal.riskLevel} | Spend: {spendText}
      </div>

      <div className={styles["nn-proposalMeta"]}>
        <span>intent: {proposal.executionIntent}</span>
        <span>plan: {proposal.executionPlan ? "ready" : "none"}</span>
        <span>{proposal.executionResult ? (proposal.executionResult.ok ? "result: success" : "result: failed") : "result: none"}</span>
      </div>

      <div className={styles["nn-proposalActions"]} onClick={(event) => event.stopPropagation()}>
        {proposal.status === "draft" ? (
          <>
            <Tooltip text="Approve this draft proposal.">
              <span data-tour-target="approve-button">
                <Button
                  size="sm"
                  className={styles["nn-primaryAction"]}
                  onClick={() => onApprove(proposal.id)}
                  disabled={loadingAction !== null}
                >
                  {loadingAction === `approve:${proposal.id}` ? "Approving..." : "Approve"}
                </Button>
              </span>
            </Tooltip>
            <Tooltip text="Reject this proposal and stop its flow.">
              <span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onReject(proposal.id)}
                  disabled={loadingAction !== null}
                >
                  {loadingAction === `reject:${proposal.id}` ? "Rejecting..." : "Reject"}
                </Button>
              </span>
            </Tooltip>
          </>
        ) : null}

        {proposal.status === "approved" && proposal.executionIntent === "none" ? (
          <Tooltip text="Request intent before lock.">
            <span>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => onRequestIntent(proposal.id)}
                disabled={loadingAction !== null}
              >
                {loadingAction === `request:${proposal.id}` ? "Requesting..." : "Request Intent"}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        {proposal.executionIntent === "requested" ? (
          <Tooltip text="Lock intent for execution path.">
            <span>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => onLockIntent(proposal.id)}
                disabled={loadingAction !== null}
              >
                {loadingAction === `lock:${proposal.id}` ? "Locking..." : "Lock Intent"}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        {proposal.executionIntent === "locked" && proposal.executionStatus === "idle" ? (
          <Tooltip text="Generate dry-run execution plan.">
            <span>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => onGeneratePlan(proposal.id)}
                disabled={loadingAction !== null}
              >
                {loadingAction === `plan:${proposal.id}` ? "Planning..." : "Generate Plan"}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        {canExecute ? (
          <Tooltip text="Execute approved, locked, planned proposal.">
            <span data-tour-target="execute-button">
              <Button
                size="sm"
                className={styles["nn-primaryAction"]}
                onClick={() => onExecute(proposal.id)}
                disabled={loadingAction !== null}
              >
                {loadingAction === `execute:${proposal.id}` ? "Executing..." : "Execute"}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        {proposal.status === "approved" ? (
          <Tooltip text="Create a strategy draft from this proposal.">
            <span>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => onDraftStrategy(proposal.id)}
                disabled={loadingAction !== null}
              >
                {loadingAction === `strategy:${proposal.id}` ? "Drafting..." : "Draft Strategy"}
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </div>

      <div className={styles["nn-proposalToggleRow"]} onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className={styles["nn-jsonToggle"]}
          onClick={() => setShowJson((prev) => !prev)}
          aria-expanded={showJson}
        >
          {showJson ? "Hide JSON" : "View JSON"}
        </button>
      </div>

      {showJson ? (
        <pre className={styles["nn-proposalJson"]}>
          <code>{jsonView}</code>
        </pre>
      ) : null}
    </div>
  );
});

type MessageRowProps = {
  message: MessageEnvelope;
  proposal: SkillProposalEnvelope | null;
  isMessageSelected: boolean;
  isProposalSelected: boolean;
  clarity: ClarityLevel;
  isLongAssistant: boolean;
  isExpanded: boolean;
  renderedMarkdown: JSX.Element | null;
  onToggleExpand: (id: string) => void;
  onSelectMessage: (id: string) => void;
  onSelectProposal: (id: string) => void;
  loadingAction: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestIntent: (id: string) => void;
  onLockIntent: (id: string) => void;
  onGeneratePlan: (id: string) => void;
  onExecute: (id: string) => void;
  onDraftStrategy: (id: string) => void;
};

const MessageRow = memo(function MessageRow({
  message,
  proposal,
  isMessageSelected,
  isProposalSelected,
  clarity,
  isLongAssistant,
  isExpanded,
  renderedMarkdown,
  onToggleExpand,
  onSelectMessage,
  onSelectProposal,
  loadingAction,
  onApprove,
  onReject,
  onRequestIntent,
  onLockIntent,
  onGeneratePlan,
  onExecute,
  onDraftStrategy,
}: MessageRowProps) {
  const tags = message.metadata?.tags || [];
  const showTags = Boolean(message.metadata?.action || tags.length);
  return (
    <div
      id={`operator-message-${message.id}`}
      className={[
        styles["nn-messageRow"],
        styles.messageRow,
        isMessageSelected ? styles["nn-selectedFrame"] : "",
      ].join(" ")}
      onClick={() => onSelectMessage(message.id)}
    >
      <div className={[styles["nn-message"], roleClassName(message.role)].join(" ")}>
        <div className={[styles["nn-messageMeta"], styles.messageMeta].join(" ")}>
          {clarity === "pro" ? null : (
            <div className={styles["nn-role"]}>{roleLabel(message.role, clarity)}</div>
          )}
          <div className={styles["nn-time"]}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        {showTags ? (
          <div className={styles["nn-tags"]}>
            {message.metadata?.action ? (
              <span className={styles["nn-chip"]}>{message.metadata.action}</span>
            ) : null}
            {tags.slice(0, 3).map((tag) => (
              <span key={`${message.id}-${tag}`} className={styles["nn-chip"]}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {proposal ? (
          <ProposalInlineCard
            proposal={proposal}
            isSelected={isProposalSelected}
            onSelectProposal={onSelectProposal}
            loadingAction={loadingAction}
            onApprove={onApprove}
            onReject={onReject}
            onRequestIntent={onRequestIntent}
            onLockIntent={onLockIntent}
            onGeneratePlan={onGeneratePlan}
            onExecute={onExecute}
            onDraftStrategy={onDraftStrategy}
          />
        ) : (
          <>
            <div
              className={[
                styles["nn-messageContentWrap"],
                isLongAssistant && !isExpanded ? styles["nn-messageClamp"] : "",
              ].join(" ")}
            >
              {renderedMarkdown}
            </div>
            {isLongAssistant ? (
              <button
                type="button"
                className={styles["nn-expandButton"]}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpand(message.id);
                }}
              >
                {isExpanded ? "Show less" : "Show more"}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
});

type ConversationFeedProps = {
  messages: MessageEnvelope[];
  proposals: SkillProposalEnvelope[];
  clarity: ClarityLevel;
  selected: ConversationPanelProps["selected"];
  loadingAction: string | null;
  setDraft: (next: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestIntent: (id: string) => void;
  onLockIntent: (id: string) => void;
  onGeneratePlan: (id: string) => void;
  onExecute: (id: string) => void;
  onDraftStrategy: (id: string) => void;
  onSelectProposal: (id: string) => void;
  onSelectMessage: (id: string) => void;
};

const ConversationFeed = memo(function ConversationFeed({
  messages,
  proposals,
  clarity,
  selected,
  loadingAction,
  setDraft,
  onApprove,
  onReject,
  onRequestIntent,
  onLockIntent,
  onGeneratePlan,
  onExecute,
  onDraftStrategy,
  onSelectProposal,
  onSelectMessage,
}: ConversationFeedProps) {
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(MESSAGE_RENDER_STEP);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const previousScrollHeightRef = useRef<number | null>(null);
  const markdownCacheRef = useRef<Map<string, { content: string; rendered: JSX.Element }>>(
    new Map()
  );

  const ordered = useMemo(() => [...messages].sort((a, b) => a.createdAt - b.createdAt), [messages]);
  const totalMessages = ordered.length;
  const boundedVisibleCount = Math.min(Math.max(visibleCount, MESSAGE_RENDER_STEP), totalMessages || 0);
  const visibleStart = Math.max(0, totalMessages - boundedVisibleCount);
  const visibleMessages = useMemo(() => ordered.slice(visibleStart), [ordered, visibleStart]);
  const hasOlderMessages = visibleStart > 0;

  const proposalById = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.id, proposal])),
    [proposals]
  );

  useEffect(() => {
    setVisibleCount((prev) => {
      if (totalMessages <= MESSAGE_RENDER_STEP) return MESSAGE_RENDER_STEP;
      return Math.min(Math.max(prev, MESSAGE_RENDER_STEP), totalMessages);
    });
  }, [totalMessages]);

  useEffect(() => {
    let targetMessageId: string | null = null;

    if (selected.kind === "message" && selected.id) {
      targetMessageId = selected.id;
    } else if (selected.kind === "proposal" && selected.id) {
      const proposalMessage = ordered.find((message) => message.metadata?.proposalId === selected.id);
      targetMessageId = proposalMessage?.id || null;
    }

    if (!targetMessageId) return;

    const targetIndex = ordered.findIndex((message) => message.id === targetMessageId);
    if (targetIndex >= 0 && targetIndex < visibleStart) {
      setVisibleCount(totalMessages - targetIndex);
    }
  }, [ordered, selected, totalMessages, visibleStart]);

  useLayoutEffect(() => {
    if (previousScrollHeightRef.current === null) return;
    const node = scrollRef.current;
    if (!node) {
      previousScrollHeightRef.current = null;
      return;
    }
    const delta = node.scrollHeight - previousScrollHeightRef.current;
    node.scrollTop += Math.max(delta, 0);
    previousScrollHeightRef.current = null;
  }, [visibleMessages.length]);

  const markdownById = useMemo(() => {
    const rendered = new Map<string, JSX.Element>();
    const cache = markdownCacheRef.current;
    const activeIds = new Set(ordered.map((message) => message.id));

    for (const cacheKey of cache.keys()) {
      if (!activeIds.has(cacheKey)) cache.delete(cacheKey);
    }

    for (const message of visibleMessages) {
      const hasProposal = Boolean(
        message.metadata?.proposalId && proposalById.get(message.metadata.proposalId)
      );
      if (hasProposal) continue;

      const cached = cache.get(message.id);
      if (cached && cached.content === message.content) {
        rendered.set(message.id, cached.rendered);
        continue;
      }

      const nextRendered = renderMarkdown(message.content);
      cache.set(message.id, { content: message.content, rendered: nextRendered });
      rendered.set(message.id, nextRendered);
    }
    return rendered;
  }, [ordered, proposalById, visibleMessages]);

  const hasMessages = totalMessages > 0;
  const showBeginnerPrompts = clarity === "beginner" && !hasMessages;
  const showStandardHint = clarity === "standard" && hasMessages;

  const toggleExpanded = useCallback((messageId: string) => {
    setExpandedMessages((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  }, []);

  const loadOlderMessages = useCallback(() => {
    const node = scrollRef.current;
    if (node) previousScrollHeightRef.current = node.scrollHeight;
    setVisibleCount((prev) => Math.min(totalMessages, prev + MESSAGE_RENDER_STEP));
  }, [totalMessages]);

  return (
    <div ref={scrollRef} className={styles["nn-conversationScroll"]}>
      {hasOlderMessages ? (
        <div className={styles["nn-loadOlderWrap"]}>
          <Button size="sm" variant="subtle" onClick={loadOlderMessages}>
            Load older messages
          </Button>
        </div>
      ) : null}

      {showBeginnerPrompts ? (
        <div className={styles["nn-emptyCoach"]}>
          <div className={styles["nn-emptyTitle"]}>Try one of these:</div>
          <div className={styles["nn-starterGrid"]}>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => setDraft("Retire credits safely and show the approval steps.")}
            >
              Retire credits
            </Button>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => setDraft("Draft a Bankr strategy proposal for daily DCA.")}
            >
              Draft Bankr strategy
            </Button>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => setDraft("Explain this screen and what to do next.")}
            >
              Explain this screen
            </Button>
          </div>
        </div>
      ) : null}

      {showStandardHint ? (
        <div className={styles["nn-inlineHint"]}>
          Ask for a plan, then approve proposals before locking intent.
        </div>
      ) : null}

      {totalMessages === 0 && clarity !== "beginner" ? (
        <div className={styles["nn-emptyCoach"]}>
          <div className={styles["nn-emptyTitle"]}>Start with one of these prompts:</div>
          <div className={styles["nn-starterGrid"]}>
            <Button
              size="sm"
              variant="subtle"
              onClick={() =>
                setDraft("Read mode: summarize current policy, pending approvals, and risks.")
              }
            >
              Read: summarize current seat status
            </Button>
            <Button
              size="sm"
              variant="subtle"
              onClick={() =>
                setDraft(
                  "Propose mode: return a skill.proposal JSON for a low-risk wallet/token read."
                )
              }
            >
              Propose: draft a safe skill.proposal
            </Button>
            <Button
              size="sm"
              variant="subtle"
              onClick={() =>
                setDraft(
                  "Create a strategy draft with objective, constraints, and rollback conditions."
                )
              }
            >
              Strategy: draft a runbook-ready strategy
            </Button>
          </div>
        </div>
      ) : null}

      {proposals.length === 0 ? (
        <div className={styles["nn-emptyHint"]}>
          Proposals appear here after assistant analysis. Approvals are always manual.
        </div>
      ) : null}

      {visibleMessages.map((message) => {
        const proposal = message.metadata?.proposalId
          ? proposalById.get(message.metadata.proposalId)
          : null;
        const isMessageSelected = selected.kind === "message" && selected.id === message.id;
        const isProposalSelected =
          selected.kind === "proposal" && proposal?.id !== undefined && selected.id === proposal.id;

        const isLongAssistant =
          message.role === "assistant" &&
          !proposal &&
          (message.content.length > 1300 || message.content.split("\n").length > 26);
        const isExpanded = Boolean(expandedMessages[message.id]);

        return (
          <MessageRow
            key={message.id}
            message={message}
            proposal={proposal || null}
            isMessageSelected={isMessageSelected}
            isProposalSelected={isProposalSelected}
            clarity={clarity}
            isLongAssistant={isLongAssistant}
            isExpanded={isExpanded}
            renderedMarkdown={markdownById.get(message.id) || null}
            onToggleExpand={toggleExpanded}
            onSelectMessage={onSelectMessage}
            onSelectProposal={onSelectProposal}
            loadingAction={proposal ? loadingAction : null}
            onApprove={onApprove}
            onReject={onReject}
            onRequestIntent={onRequestIntent}
            onLockIntent={onLockIntent}
            onGeneratePlan={onGeneratePlan}
            onExecute={onExecute}
            onDraftStrategy={onDraftStrategy}
          />
        );
      })}
    </div>
  );
});

type ConversationComposerProps = {
  draft: string;
  setDraft: (next: string) => void;
  onSend: () => void;
  loading: boolean;
  policyMode: string;
  clarity: ClarityLevel;
  skillCount: number;
  strategyCount: number;
};

const ConversationComposer = memo(function ConversationComposer({
  draft,
  setDraft,
  onSend,
  loading,
  policyMode,
  clarity,
  skillCount,
  strategyCount,
}: ConversationComposerProps) {
  const activeMode = modeForPolicy(policyMode);
  const onDraftChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value),
    [setDraft]
  );
  const onDraftKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onSend();
      }
    },
    [onSend]
  );

  return (
    <div className={[styles["nn-inputBar"], styles.composer].join(" ")}>
      {clarity !== "pro" ? (
        <div className={styles["nn-composerModes"]}>
          <Tooltip text="Read mode analyzes only.">
            <span
              className={[
                styles["nn-modeChip"],
                activeMode === "READ" ? styles["nn-modeActive"] : styles["nn-modeInactive"],
              ].join(" ")}
            >
              Read
            </span>
          </Tooltip>
          <Tooltip text="Propose mode drafts structured actions.">
            <span
              className={[
                styles["nn-modeChip"],
                activeMode === "PROPOSE" ? styles["nn-modeActive"] : styles["nn-modeInactive"],
              ].join(" ")}
            >
              Propose
            </span>
          </Tooltip>
          <Tooltip text="Execute is locked until approval and intent lock.">
            <span
              className={[
                styles["nn-modeChip"],
                styles["nn-modeLocked"],
                activeMode === "EXECUTE" ? styles["nn-modeActive"] : styles["nn-modeInactive"],
              ].join(" ")}
            >
              Execute
            </span>
          </Tooltip>
          <div className={styles["nn-muted"]}>
            {clarity === "beginner"
              ? "Ask a question, then approve proposals before execution."
              : `Skills: ${skillCount} · Templates: ${strategyCount}`}
          </div>
        </div>
      ) : null}

      <div className={styles["nn-composerMain"]}>
        <Textarea
          data-tour-target="chat-input"
          className={styles["nn-input"]}
          rows={2}
          value={draft}
          onChange={onDraftChange}
          placeholder="Ask for analysis, draft a proposal, or create a strategy."
          onKeyDown={onDraftKeyDown}
        />
        <Tooltip text="Send your message to the operator assistant.">
          <span>
            <Button className={styles["nn-sendPrimary"]} onClick={onSend} disabled={loading || !draft.trim()}>
              {loading ? "Sending..." : "Send"}
            </Button>
          </span>
        </Tooltip>
      </div>

      {clarity !== "pro" ? (
        <div className={styles["nn-actions"]}>
          <div className={styles["nn-muted"]}>Ctrl/Cmd + Enter to send</div>
        </div>
      ) : null}
    </div>
  );
});

export default function ConversationPanel({
  messages,
  proposals,
  draft,
  setDraft,
  onSend,
  loading,
  policyMode,
  clarity,
  skills,
  strategies,
  onApprove,
  onReject,
  onRequestIntent,
  onLockIntent,
  onGeneratePlan,
  onExecute,
  onDraftStrategy,
  onSelectProposal,
  onSelectMessage,
  selected,
  loadingAction,
}: ConversationPanelProps) {
  return (
    <div id="operator-conversation-root" className={[styles["nn-columnBody"], styles.panelBody].join(" ")}>
      <FirstRunTour />

      <ConversationFeed
        messages={messages}
        proposals={proposals}
        clarity={clarity}
        selected={selected}
        loadingAction={loadingAction}
        setDraft={setDraft}
        onApprove={onApprove}
        onReject={onReject}
        onRequestIntent={onRequestIntent}
        onLockIntent={onLockIntent}
        onGeneratePlan={onGeneratePlan}
        onExecute={onExecute}
        onDraftStrategy={onDraftStrategy}
        onSelectProposal={onSelectProposal}
        onSelectMessage={onSelectMessage}
      />

      <ConversationComposer
        draft={draft}
        setDraft={setDraft}
        onSend={onSend}
        loading={loading}
        policyMode={policyMode}
        clarity={clarity}
        skillCount={skills.length}
        strategyCount={strategies.length}
      />
    </div>
  );
}
