"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import ConversationPanel from "@/components/operator/ConversationPanel";
import OperatorTopBar from "@/components/operator/OperatorTopBar";
import OpsBoard from "@/components/operator/OpsBoard";
import ThreadSidebar, { type ThreadItem } from "@/components/operator/ThreadSidebar";
import styles from "@/components/operator/OperatorSeat.module.css";
import type { SkillInfo } from "@/lib/operator/skillContext";
import type { Strategy } from "@/lib/operator/strategy";
import type { OperatorStrategyTemplate } from "@/lib/operator/strategies";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";
import {
  approveProposalAction,
  createBankrDraftAction,
  createDraftProposalFromTemplate,
  executeProposalAction,
  generateExecutionPlanAction,
  lockExecutionIntentAction,
  pinStrategyAction,
  proposeFromBankrDraftAction,
  proposeStrategyFromAssistantProposal,
  rejectProposalAction,
  requestExecutionIntentAction,
  sendOperatorMessageAction,
  unpinStrategyAction,
  updateStrategyRunbookAction,
  type OperatorStateResponse,
} from "./actions";

type Props = {
  initialMessages: MessageEnvelope[];
  initialProposals: SkillProposalEnvelope[];
  initialStrategies: Strategy[];
  initialPnl: OperatorStateResponse["pnl"];
  skills: SkillInfo[];
  strategies: OperatorStrategyTemplate[];
  policyMode: string;
  policyHealthy: boolean;
  dbConnected: boolean;
  engineType: "openrouter" | "local";
  engineModel: string;
};

type DraftThread = {
  id: string;
  createdAt: number;
};

function dayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function trimLine(input: string): string {
  const oneLine = input.replace(/\s+/g, " ").trim();
  if (!oneLine) return "Untitled session";
  return oneLine.length > 60 ? `${oneLine.slice(0, 60)}...` : oneLine;
}

function buildPersistedThreads(
  messages: MessageEnvelope[],
  assignments: Record<string, string>
): ThreadItem[] {
  const groups = new Map<string, MessageEnvelope[]>();
  const ordered = [...messages].sort((a, b) => a.createdAt - b.createdAt);

  for (const message of ordered) {
    if (assignments[message.id]) continue;
    const id = `day:${dayKey(message.createdAt)}`;
    const existing = groups.get(id);
    if (existing) existing.push(message);
    else groups.set(id, [message]);
  }

  return [...groups.entries()]
    .map(([id, threadMessages]) => {
      const first = threadMessages.find(
        (message) =>
          message.role === "operator" ||
          message.role === "assistant" ||
          message.role === "system"
      );
      const last = threadMessages[threadMessages.length - 1];
      return {
        id,
        title: trimLine(first?.content || "Session"),
        updatedAt: last?.createdAt || Date.now(),
        messageCount: threadMessages.length,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function buildDraftThreads(
  drafts: DraftThread[],
  messages: MessageEnvelope[],
  assignments: Record<string, string>
): ThreadItem[] {
  return drafts
    .map((draft) => {
      const assigned = messages
        .filter((message) => assignments[message.id] === draft.id)
        .sort((a, b) => a.createdAt - b.createdAt);

      const first = assigned.find(
        (message) => message.role === "operator" || message.role === "assistant"
      );
      const last = assigned[assigned.length - 1];

      return {
        id: draft.id,
        title: trimLine(first?.content || "New chat"),
        updatedAt: last?.createdAt || draft.createdAt,
        messageCount: assigned.length,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export default function OperatorConsoleClient({
  initialMessages,
  initialProposals,
  initialStrategies,
  initialPnl,
  skills,
  strategies,
  policyMode,
  policyHealthy,
  dbConnected,
  engineType,
  engineModel,
}: Props) {
  const [messages, setMessages] = useState<MessageEnvelope[]>(initialMessages);
  const [proposals, setProposals] = useState<SkillProposalEnvelope[]>(initialProposals);
  const [strategyMemory, setStrategyMemory] = useState<Strategy[]>(initialStrategies);
  const [pnl, setPnl] = useState(initialPnl);
  const [draft, setDraft] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [threadAssignments, setThreadAssignments] = useState<Record<string, string>>({});
  const [draftThreads, setDraftThreads] = useState<DraftThread[]>([]);
  const [pending, startTransition] = useTransition();
  const seenMessageIdsRef = useRef<Set<string>>(
    new Set(initialMessages.map((message) => message.id))
  );

  const persistedThreads = useMemo(
    () => buildPersistedThreads(messages, threadAssignments),
    [messages, threadAssignments]
  );

  const syntheticThreads = useMemo(
    () => buildDraftThreads(draftThreads, messages, threadAssignments),
    [draftThreads, messages, threadAssignments]
  );

  const threads = useMemo(
    () => [...syntheticThreads, ...persistedThreads].sort((a, b) => b.updatedAt - a.updatedAt),
    [persistedThreads, syntheticThreads]
  );

  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    () => buildPersistedThreads(initialMessages, {})[0]?.id || null
  );

  const filteredMessages = useMemo(() => {
    if (!activeThreadId) return [...messages].sort((a, b) => a.createdAt - b.createdAt);

    if (activeThreadId.startsWith("draft:")) {
      return messages
        .filter((message) => threadAssignments[message.id] === activeThreadId)
        .sort((a, b) => a.createdAt - b.createdAt);
    }

    const selectedDay = activeThreadId.replace("day:", "");
    return messages
      .filter(
        (message) =>
          !threadAssignments[message.id] && dayKey(message.createdAt) === selectedDay
      )
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [activeThreadId, messages, threadAssignments]);

  function applyState(next: OperatorStateResponse, targetThreadId: string | null) {
    const seen = seenMessageIdsRef.current;
    const newMessages = next.messages.filter((message) => !seen.has(message.id));
    seenMessageIdsRef.current = new Set(next.messages.map((message) => message.id));

    if (targetThreadId && targetThreadId.startsWith("draft:") && newMessages.length > 0) {
      setThreadAssignments((prev) => {
        const updated = { ...prev };
        for (const message of newMessages) updated[message.id] = targetThreadId;
        return updated;
      });
    }

    setMessages(next.messages);
    setProposals(next.proposals);
    setStrategyMemory(next.strategies);
    setPnl(next.pnl);
  }

  function runAction(
    actionKey: string,
    fn: () => Promise<OperatorStateResponse>,
    targetThreadId: string | null = activeThreadId
  ) {
    setLoadingAction(actionKey);
    startTransition(async () => {
      try {
        const next = await fn();
        applyState(next, targetThreadId);
      } finally {
        setLoadingAction(null);
      }
    });
  }

  async function runActionNow(
    actionKey: string,
    fn: () => Promise<OperatorStateResponse>,
    targetThreadId: string | null = activeThreadId
  ): Promise<void> {
    setLoadingAction(actionKey);
    try {
      const next = await fn();
      applyState(next, targetThreadId);
    } finally {
      setLoadingAction(null);
    }
  }

  function onSend() {
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    runAction("send", () => sendOperatorMessageAction(value), activeThreadId);
  }

  function onCreateThread() {
    const id = `draft:${Date.now()}`;
    setDraftThreads((prev) => [{ id, createdAt: Date.now() }, ...prev]);
    setActiveThreadId(id);
    setDraft("");
  }

  function onSelectThread(id: string) {
    setActiveThreadId(id);
  }

  function resolveThreadIdForMessage(message: MessageEnvelope): string {
    const assigned = threadAssignments[message.id];
    if (assigned) return assigned;
    return `day:${dayKey(message.createdAt)}`;
  }

  function pulse(target: HTMLElement | null) {
    if (!target) return;
    target.classList.add(styles["nn-focusPulse"]);
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => target.classList.remove(styles["nn-focusPulse"]), 1400);
  }

  function focusProposal(proposalId: string) {
    const proposalMessage = messages.find((message) => message.metadata?.proposalId === proposalId);
    if (proposalMessage) {
      const nextThreadId = resolveThreadIdForMessage(proposalMessage);
      if (activeThreadId !== nextThreadId) setActiveThreadId(nextThreadId);
    }

    window.setTimeout(() => {
      const proposalNode = document.getElementById(`operator-proposal-${proposalId}`);
      if (proposalNode) {
        pulse(proposalNode);
        return;
      }
      if (proposalMessage) {
        const messageNode = document.getElementById(`operator-message-${proposalMessage.id}`);
        pulse(messageNode);
      }
    }, 60);
  }

  function focusMessage(messageId: string) {
    const message = messages.find((entry) => entry.id === messageId);
    if (message) {
      const nextThreadId = resolveThreadIdForMessage(message);
      if (activeThreadId !== nextThreadId) setActiveThreadId(nextThreadId);
    }

    window.setTimeout(() => {
      const node = document.getElementById(`operator-message-${messageId}`);
      pulse(node);
    }, 60);
  }

  return (
    <div className={[styles["nn-root"], styles.seat].join(" ")}>
      <div className={styles["nn-main"]}>
        <aside className={[styles.left, styles.panel, styles["nn-sidebar"]].join(" ")}>
          <ThreadSidebar
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={onSelectThread}
            onCreateThread={onCreateThread}
          />
        </aside>

        <section className={[styles["nn-center"], styles.panel, styles["nn-centerColumn"]].join(" ")}>
          <OperatorTopBar
            policyMode={policyMode}
            dbConnected={dbConnected}
            engineType={engineType}
            engineModel={engineModel}
            policyHealthy={policyHealthy}
          />
          <ConversationPanel
            messages={filteredMessages}
            proposals={proposals}
            draft={draft}
            setDraft={setDraft}
            onSend={onSend}
            loading={pending && loadingAction === "send"}
            policyMode={policyMode}
            skills={skills}
            strategies={strategies}
            onApprove={(id) => runAction(`approve:${id}`, () => approveProposalAction(id))}
            onReject={(id) => runAction(`reject:${id}`, () => rejectProposalAction(id))}
            onRequestIntent={(id) =>
              runAction(`request:${id}`, () => requestExecutionIntentAction(id))
            }
            onLockIntent={(id) => runAction(`lock:${id}`, () => lockExecutionIntentAction(id))}
            onGeneratePlan={(id) => runAction(`plan:${id}`, () => generateExecutionPlanAction(id))}
            onExecute={(id) => runAction(`execute:${id}`, () => executeProposalAction(id))}
            onDraftStrategy={(id) =>
              runAction(`strategy:${id}`, () => proposeStrategyFromAssistantProposal(id))
            }
            loadingAction={loadingAction}
          />
        </section>

        <aside className={[styles.right, styles.panel, styles["nn-opsColumn"]].join(" ")}>
          <OpsBoard
            proposals={proposals}
            messages={messages}
            strategies={strategyMemory}
            pnl={pnl}
            policyMode={policyMode}
            onCreateDraftProposal={(templateId, input) =>
              runActionNow(
                `template:${templateId}`,
                () => createDraftProposalFromTemplate(templateId, input),
                activeThreadId
              )
            }
            onCreateBankrDraft={(text) =>
              runActionNow(
                "bankr-draft:create",
                () => createBankrDraftAction(text),
                activeThreadId
              )
            }
            onProposeBankrDraft={(strategyId) =>
              runActionNow(
                `bankr-draft:propose:${strategyId}`,
                () => proposeFromBankrDraftAction(strategyId),
                activeThreadId
              )
            }
            onPinStrategy={(strategyId) =>
              runActionNow(
                `strategy:pin:${strategyId}`,
                () => pinStrategyAction(strategyId),
                activeThreadId
              )
            }
            onUnpinStrategy={(strategyId) =>
              runActionNow(
                `strategy:unpin:${strategyId}`,
                () => unpinStrategyAction(strategyId),
                activeThreadId
              )
            }
            onUpdateRunbook={(strategyId, markdown) =>
              runActionNow(
                `strategy:runbook:${strategyId}`,
                () => updateStrategyRunbookAction(strategyId, markdown),
                activeThreadId
              )
            }
            onFocusProposal={focusProposal}
            onFocusMessage={focusMessage}
            loadingAction={loadingAction}
          />
        </aside>
      </div>
    </div>
  );
}
