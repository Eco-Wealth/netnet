"use client";

import { useState, useTransition } from "react";
import ConversationPanel from "@/components/operator/ConversationPanel";
import OperatorTopBar from "@/components/operator/OperatorTopBar";
import OpsBoard from "@/components/operator/OpsBoard";
import styles from "@/components/operator/OperatorSeat.module.css";
import type { SkillInfo } from "@/lib/operator/skillContext";
import type { Strategy } from "@/lib/operator/strategy";
import type { OperatorStrategyTemplate } from "@/lib/operator/strategies";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";
import {
  approveProposalAction,
  executeProposalAction,
  lockExecutionIntentAction,
  rejectProposalAction,
  requestExecutionIntentAction,
  sendOperatorMessageAction,
  type OperatorStateResponse,
} from "./actions";

type Props = {
  initialMessages: MessageEnvelope[];
  initialProposals: SkillProposalEnvelope[];
  initialStrategies: Strategy[];
  skills: SkillInfo[];
  strategies: OperatorStrategyTemplate[];
  policyMode: string;
  policyHealthy: boolean;
  dbConnected: boolean;
  engineType: "openrouter" | "local";
};

export default function OperatorConsoleClient({
  initialMessages,
  initialProposals,
  initialStrategies,
  skills,
  strategies,
  policyMode,
  policyHealthy,
  dbConnected,
  engineType,
}: Props) {
  const [messages, setMessages] = useState<MessageEnvelope[]>(initialMessages);
  const [proposals, setProposals] = useState<SkillProposalEnvelope[]>(initialProposals);
  const [strategyMemory, setStrategyMemory] = useState<Strategy[]>(initialStrategies);
  const [draft, setDraft] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyState(next: OperatorStateResponse) {
    setMessages(next.messages);
    setProposals(next.proposals);
    setStrategyMemory(next.strategies);
  }

  function runAction(actionKey: string, fn: () => Promise<OperatorStateResponse>) {
    setLoadingAction(actionKey);
    startTransition(async () => {
      try {
        const next = await fn();
        applyState(next);
      } finally {
        setLoadingAction(null);
      }
    });
  }

  function onSend() {
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    runAction("send", () => sendOperatorMessageAction(value));
  }

  return (
    <div className={styles["nn-root"]}>
      <OperatorTopBar
        policyMode={policyMode}
        dbConnected={dbConnected}
        engineType={engineType}
        policyHealthy={policyHealthy}
      />

      <div className={styles["nn-main"]}>
        <section className={styles["nn-column"]}>
          <ConversationPanel
            messages={messages}
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
            onRequestIntent={(id) => runAction(`request:${id}`, () => requestExecutionIntentAction(id))}
            onLockIntent={(id) => runAction(`lock:${id}`, () => lockExecutionIntentAction(id))}
            onExecute={(id) => runAction(`execute:${id}`, () => executeProposalAction(id))}
            loadingAction={loadingAction}
          />
        </section>

        <aside className={styles["nn-column"]}>
          <OpsBoard
            proposals={proposals}
            messages={messages}
            strategies={strategyMemory}
            policyMode={policyMode}
          />
        </aside>
      </div>
    </div>
  );
}
