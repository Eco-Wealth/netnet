"use client";

import { Button } from "@/components/ui";
import Tooltip from "@/components/operator/Tooltip";
import styles from "@/components/operator/OperatorSeat.module.css";
import type { OperatorLayoutMode } from "@/lib/operator/layout";

type Mode = "READ" | "PROPOSE" | "EXECUTE";

type OperatorTopBarProps = {
  policyMode: string;
  dbConnected: boolean;
  engineType: "openrouter" | "local";
  engineModel: string;
  policyHealthy: boolean;
  layoutMode: OperatorLayoutMode;
  onLayoutModeChange: (mode: OperatorLayoutMode) => void;
};

function toMode(policyMode: string): Mode {
  if (policyMode === "READ_ONLY") return "READ";
  if (policyMode === "EXECUTE_WITH_LIMITS") return "EXECUTE";
  return "PROPOSE";
}

function compactModelLabel(engineType: "openrouter" | "local", engineModel: string): string {
  const trimmed = String(engineModel || "").trim();
  if (!trimmed) return engineType;
  return trimmed.length > 44 ? `${trimmed.slice(0, 44)}...` : trimmed;
}

export default function OperatorTopBar({
  policyMode,
  dbConnected,
  engineType,
  engineModel,
  policyHealthy,
  layoutMode,
  onLayoutModeChange,
}: OperatorTopBarProps) {
  const active = toMode(policyMode);
  const modeHelp: Record<Mode, string> = {
    READ: "Read analyzes only.",
    PROPOSE: "Propose drafts actions.",
    EXECUTE: "Execute requires locked approval path.",
  };

  function reopenTour() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("nn_operator_first_run_done", "0");
    window.dispatchEvent(new Event("nn-operator-tour-reopen"));
  }

  return (
    <div className={styles["nn-topbar"]}>
      <div className={styles["nn-topbarLeft"]}>
        <div className={styles["nn-topbarTitle"]}>Operator Seat</div>
        <div className={styles["nn-topbarSubtle"]}>
          Engine: {engineType} · {compactModelLabel(engineType, engineModel)}
        </div>
      </div>

      <div className={styles["nn-topbarModes"]} data-tour-target="mode-toggle">
        {(["READ", "PROPOSE", "EXECUTE"] as Mode[]).map((mode) => (
          <Tooltip key={mode} text={modeHelp[mode]}>
            <span
              className={[
                styles["nn-modeChip"],
                active === mode ? styles["nn-modeActive"] : styles["nn-modeInactive"],
                mode === "EXECUTE" ? styles["nn-modeLocked"] : "",
              ].join(" ")}
            >
              {mode}
            </span>
          </Tooltip>
        ))}
      </div>

      <div className={styles["nn-layoutModes"]}>
        <Tooltip text="Chat + Ops (default)">
          <button
            type="button"
            className={[
              styles["nn-layoutChip"],
              layoutMode === "twoPane" ? styles["nn-layoutChipActive"] : "",
            ].join(" ")}
            onClick={() => onLayoutModeChange("twoPane")}
          >
            2-Pane
          </button>
        </Tooltip>
        <Tooltip text="Threads + Chat + Ops + Inspector">
          <button
            type="button"
            className={[
              styles["nn-layoutChip"],
              layoutMode === "fourPane" ? styles["nn-layoutChipActive"] : "",
            ].join(" ")}
            onClick={() => onLayoutModeChange("fourPane")}
          >
            4-Pane
          </button>
        </Tooltip>
      </div>

      <div className={styles["nn-chipRow"]}>
        <span className={styles["nn-chip"]}>
          <span
            className={[
              styles["nn-statusDot"],
              dbConnected ? styles["nn-ok"] : styles["nn-fail"],
            ].join(" ")}
          />{" "}
          DB
        </span>
        <Tooltip text="Policy mode controls run permission.">
          <span className={styles["nn-chip"]}>
            <span
              className={[
                styles["nn-statusDot"],
                policyHealthy ? styles["nn-ok"] : styles["nn-warn"],
              ].join(" ")}
            />{" "}
            {policyMode}
          </span>
        </Tooltip>
        <Tooltip text="Reopen first-run walkthrough.">
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
