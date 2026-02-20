"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/components/operator/OperatorSeat.module.css";

const STORAGE_KEY = "nn.operator.onboarding.dismissed";

type Step = {
  id: string;
  label: string;
  hint: string;
};

const STEPS: Step[] = [
  {
    id: "ask",
    label: "Ask for a plan",
    hint: "Describe the outcome. The assistant drafts a proposal.",
  },
  {
    id: "review",
    label: "Review proposal",
    hint: "Open the proposal card and scan actions + policy.",
  },
  {
    id: "approve",
    label: "Approve",
    hint: "Approval is your explicit go/no-go.",
  },
  {
    id: "lock",
    label: "Lock intent",
    hint: "Lock intent freezes the proposal for execution.",
  },
  {
    id: "execute",
    label: "Execute",
    hint: "Execute runs only when approved + locked.",
  },
];

function loadDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function saveDismissed(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
}

export default function OnboardingCard() {
  const [dismissed, setDismissed] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const subtitle = useMemo(
    () => "Ask \u2192 approve \u2192 lock \u2192 execute. Always manual approvals.",
    []
  );

  if (dismissed) {
    return (
      <div className={styles["nn-onboardingHeader"]}>
        <button
          type="button"
          className={styles["nn-showOnboarding"]}
          onClick={() => {
            saveDismissed(false);
            setDismissed(false);
          }}
        >
          Show
        </button>
      </div>
    );
  }

  return (
    <div className={styles["nn-onboardingDock"]}>
      <section className={styles["nn-onboardingCard"]} aria-label="Start here">
        <div className={styles["nn-onboardingTop"]}>
          <div>
            <div className={styles["nn-sectionTitle"]}>Start here</div>
            <div className={styles["nn-muted"]}>{subtitle}</div>
          </div>
          <button
            type="button"
            className={styles["nn-showOnboarding"]}
            onClick={() => {
              saveDismissed(true);
              setDismissed(true);
            }}
          >
            Dismiss
          </button>
        </div>

        <ol className={styles["nn-onboardingList"]}>
          {STEPS.map((step, index) => {
            const expanded = expandedStep === step.id;
            return (
              <li key={step.id} className={styles["nn-onboardingItem"]}>
                <div className={styles["nn-onboardingRow"]}>
                  <span className={styles["nn-stepBadge"]}>{index + 1}</span>
                  <span>{step.label}</span>
                  <button
                    type="button"
                    className={styles["nn-learnLink"]}
                    onClick={() => setExpandedStep(expanded ? null : step.id)}
                    aria-expanded={expanded}
                  >
                    Learn
                  </button>
                </div>
                <div
                  className={[
                    styles["nn-onboardingHint"],
                    expanded ? styles["nn-onboardingHintOpen"] : "",
                  ].join(" ")}
                >
                  {step.hint}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
