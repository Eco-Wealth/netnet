import OperatorConsoleClient from "./operator-console-client";
import {
  getPnLSummary,
  listMessages,
  listProposals,
  listStrategies,
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

  return (
    <div className={styles["nn-pagePad"]}>
      <OperatorConsoleClient
        initialMessages={listMessages()}
        initialProposals={listProposals()}
        initialStrategies={listStrategies()}
        initialPnl={getPnLSummary()}
        skills={getSkills()}
        strategies={OPERATOR_STRATEGY_TEMPLATES}
        policyMode={policy.autonomy}
        policyHealthy={!policy.kill.all}
        dbConnected
        engineType={engineType}
      />
    </div>
  );
}
