"use client";

import Insight from "@/components/Insight";
import { Button } from "@/components/ui";
import styles from "@/components/operator/OperatorSeat.module.css";

type Mode = "READ" | "PROPOSE" | "EXECUTE";

type OperatorTopBarProps = {
  policyMode: string;
  dbConnected: boolean;
  engineType: "openrouter" | "local";
  policyHealthy: boolean;
};

function toMode(policyMode: string): Mode {
  if (policyMode === "READ_ONLY") return "READ";
  if (policyMode === "EXECUTE_WITH_LIMITS") return "EXECUTE";
  return "PROPOSE";
}

export default function OperatorTopBar({
  policyMode,
  dbConnected,
  engineType,
  policyHealthy,
}: OperatorTopBarProps) {
  const active = toMode(policyMode);

  return (
    <div className={styles["nn-topbar"]}>
      <div>
        <div className={styles["nn-topbarTitle"]}>Operator Seat v2 · Chat-First OS</div>
        <div className={styles["nn-topbarSubtle"]}>One surface for analysis, proposals, and controlled execution.</div>
      </div>

      <div className={styles["nn-modeGroup"]}>
        {(["READ", "PROPOSE", "EXECUTE"] as Mode[]).map((mode) => (
          <Insight
            key={mode}
            insight={{
              what: `${mode} mode preview reflects current policy level.`,
              when: "Use Governance to change actual policy mode.",
              requires: "Operator policy permissions.",
              output: "Mode chip updates after policy change.",
            }}
          >
            <span
              className={[
                styles["nn-modeWrap"],
                active === mode ? "" : styles["nn-modeInactive"],
              ].join(" ")}
            >
              <Button
                size="sm"
                variant={active === mode ? "solid" : "subtle"}
                disabled
                aria-label={`Mode ${mode}`}
              >
                {mode}
              </Button>
            </span>
          </Insight>
        ))}
      </div>

      <div className={styles["nn-chipRow"]}>
        <span className={styles["nn-chip"]}>
          <span className={[styles["nn-statusDot"], dbConnected ? styles["nn-ok"] : styles["nn-fail"]].join(" ")} />{" "}
          DB {dbConnected ? "connected" : "offline"}
        </span>
        <span className={styles["nn-chip"]}>
          <span className={[styles["nn-statusDot"], styles["nn-ok"]].join(" ")} /> Engine {engineType}
        </span>
        <span className={styles["nn-chip"]}>
          <span className={[styles["nn-statusDot"], policyHealthy ? styles["nn-ok"] : styles["nn-warn"]].join(" ")} /> Policy {policyMode}
        </span>
      </div>
    </div>
  );
}
