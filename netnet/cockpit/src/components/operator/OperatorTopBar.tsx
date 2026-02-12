"use client";

import styles from "@/components/operator/OperatorSeat.module.css";
import Tooltip from "@/components/operator/Tooltip";
import { Button } from "@/components/ui";

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
  const modeHelp: Record<Mode, string> = {
    READ: "Assistant can analyze only.",
    PROPOSE: "Assistant can suggest structured actions.",
    EXECUTE: "Locked proposals may run after approval.",
  };

  function reopenTour() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("nn_operator_first_run_done", "0");
    window.dispatchEvent(new Event("nn-operator-tour-reopen"));
  }

  return (
    <div className={styles["nn-topbar"]}>
      <div>
        <div className={styles["nn-topbarTitle"]}>Operator Seat v3</div>
        <div className={styles["nn-topbarSubtle"]}>Dense chat-first workspace with gated execution.</div>
      </div>

      <div className={styles["nn-topbarModes"]}>
        <div className={styles["nn-currentMode"]}>Current: {active}</div>
        <div className={styles["nn-modeGroup"]} data-tour-target="mode-toggle">
          {(["READ", "PROPOSE", "EXECUTE"] as Mode[]).map((mode) => (
            <Tooltip key={mode} text={modeHelp[mode]}>
              <span
                className={[
                  styles["nn-modeChip"],
                  active === mode ? styles["nn-modeActive"] : styles["nn-modeInactive"],
                ].join(" ")}
                aria-label={`Mode ${mode}`}
              >
                {mode}
              </span>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className={styles["nn-chipRow"]}>
        <span className={styles["nn-chip"]}>
          <span className={[styles["nn-statusDot"], dbConnected ? styles["nn-ok"] : styles["nn-fail"]].join(" ")} />{" "}
          DB {dbConnected ? "connected" : "offline"}
        </span>
        <span className={styles["nn-chip"]}>
          <span className={[styles["nn-statusDot"], styles["nn-ok"]].join(" ")} /> Engine {engineType}
        </span>
        <Tooltip text="Policy mode controls what actions the seat can run.">
          <span className={styles["nn-chip"]}>
            <span className={[styles["nn-statusDot"], policyHealthy ? styles["nn-ok"] : styles["nn-warn"]].join(" ")} /> Policy {policyMode}
          </span>
        </Tooltip>
        <Tooltip text="Reopen the first-run tour at any time.">
          <span>
            <Button size="sm" variant="subtle" onClick={reopenTour}>
              Help
            </Button>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
