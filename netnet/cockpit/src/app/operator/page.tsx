import OperatorConsoleClient from "./operator-console-client";
import PageHeader from "@/components/PageHeader";
import {
  getPnLSummary,
  getActiveWalletProfile,
  listMessages,
  listProposals,
  listStrategies,
  listWalletProfiles,
} from "@/lib/operator/store";
import { getSkills } from "@/lib/operator/skillContext";
import { OPERATOR_STRATEGY_TEMPLATES } from "@/lib/operator/strategies";
import { getPolicy } from "@/lib/policy/store";
import styles from "@/components/operator/OperatorSeat.module.css";

export default function OperatorPage() {
  const policy = getPolicy();
  const engineType = (process.env.OPERATOR_ENGINE === "local" ? "local" : "openrouter") as
    | "openrouter"
    | "local";
  const engineModel =
    engineType === "local"
      ? process.env.LOCAL_LLM_ENDPOINT || "local endpoint"
      : process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  return (
    <div className={styles["nn-pagePad"]}>
      <div className={styles["nn-pageShell"]}>
        <PageHeader
          title="Operator"
          subtitle="Chat-first command seat for proposal-first operations."
          guidance="Start with Read/Propose prompts, then approve, lock intent, generate plan, and execute."
          outputs="Produces: messages, proposal envelopes, intent/plan state, strategy memory, and execution results."
        />
        <div className={styles["nn-pageBody"]}>
          <OperatorConsoleClient
            initialMessages={listMessages()}
            initialProposals={listProposals()}
            initialStrategies={listStrategies()}
            initialPnl={getPnLSummary()}
            initialWalletProfiles={listWalletProfiles()}
            initialActiveWalletProfileId={getActiveWalletProfile()?.id || null}
            skills={getSkills()}
            strategies={OPERATOR_STRATEGY_TEMPLATES}
            policyMode={policy.autonomy}
            policyHealthy={!policy.kill.all}
            dbConnected
            engineType={engineType}
            engineModel={engineModel}
          />
        </div>
      </div>
    </div>
  );
}
