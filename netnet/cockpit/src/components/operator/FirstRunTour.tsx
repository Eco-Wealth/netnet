"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import styles from "@/components/operator/OperatorSeat.module.css";

const TOUR_KEY = "nn_operator_first_run_done";
const TOUR_REOPEN_EVENT = "nn-operator-tour-reopen";

type TourStep = {
  id: string;
  title: string;
  text: string;
  selector: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "chat-input",
    title: "Chat input",
    text: "Type your request here to start analysis and proposal drafting.",
    selector: '[data-tour-target="chat-input"]',
  },
  {
    id: "mode-toggle",
    title: "Mode chips",
    text: "Read, Propose, and Execute show the current safety mode.",
    selector: '[data-tour-target="mode-toggle"]',
  },
  {
    id: "approve-button",
    title: "Approve button",
    text: "Approve moves a draft proposal into the execution-intent flow.",
    selector: '[data-tour-target="approve-button"]',
  },
  {
    id: "ops-status",
    title: "Ops status",
    text: "This board summarizes policy mode, pending approvals, and running work.",
    selector: '[data-tour-target="ops-status"]',
  },
  {
    id: "execute-button",
    title: "Execute button",
    text: "Execute appears only after approval, intent lock, and a generated plan.",
    selector: '[data-tour-target="execute-button"]',
  },
];

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function markDone() {
  if (!canUseStorage()) return;
  window.localStorage.setItem(TOUR_KEY, "1");
}

function shouldOpenOnLoad(): boolean {
  if (!canUseStorage()) return false;
  const value = window.localStorage.getItem(TOUR_KEY);
  return value !== "1";
}

export default function FirstRunTour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const step = useMemo(() => TOUR_STEPS[stepIndex], [stepIndex]);

  useEffect(() => {
    setOpen(shouldOpenOnLoad());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleReopen = () => {
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener(TOUR_REOPEN_EVENT, handleReopen);
    return () => window.removeEventListener(TOUR_REOPEN_EVENT, handleReopen);
  }, []);

  useEffect(() => {
    if (!open || !step) return;
    if (typeof document === "undefined") return;

    const target = document.querySelector(step.selector) as HTMLElement | null;
    if (!target) return;
    target.classList.add(styles["nn-tourHighlight"]);
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    return () => {
      target.classList.remove(styles["nn-tourHighlight"]);
    };
  }, [open, step]);

  if (!open || !step) return null;

  const isLast = stepIndex >= TOUR_STEPS.length - 1;

  return (
    <div className={styles["nn-tourLayer"]} aria-live="polite">
      <div className={styles["nn-tourPanel"]}>
        <div className={styles["nn-listHead"]}>
          <div>
            <div className={styles["nn-sectionTitle"]}>Operator Tour</div>
            <div className={styles["nn-muted"]}>
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </div>
          </div>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => {
              markDone();
              setOpen(false);
            }}
          >
            Skip
          </Button>
        </div>

        <div className={styles["nn-listItem"]}>
          <div>{step.title}</div>
          <div className={styles["nn-muted"]}>{step.text}</div>
        </div>

        <div className={styles["nn-actions"]}>
          {!isLast ? (
            <Button size="sm" onClick={() => setStepIndex((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1))}>
              Next
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                markDone();
                setOpen(false);
              }}
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
