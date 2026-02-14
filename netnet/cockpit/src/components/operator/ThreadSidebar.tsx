"use client";

import { Button } from "@/components/ui";
import styles from "@/components/operator/OperatorSeat.module.css";
import Tooltip from "@/components/operator/Tooltip";
import type { ClarityLevel } from "@/lib/operator/clarity";

export type ThreadItem = {
  id: string;
  title: string;
  updatedAt: number;
  messageCount: number;
};

type ThreadSidebarProps = {
  threads: ThreadItem[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onCreateThread: () => void;
  clarity: ClarityLevel;
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ThreadSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  clarity,
}: ThreadSidebarProps) {
  return (
    <div className={styles["nn-columnBody"]}>
      <div className={styles["nn-sectionHeader"]}>
        <div>
          <div className={styles["nn-sectionTitle"]}>Threads</div>
          {clarity !== "pro" ? (
            <div className={styles["nn-muted"]}>
              {clarity === "beginner"
                ? "Threads are separate work sessions."
                : "Sessions"}
            </div>
          ) : null}
        </div>
        <Tooltip
          text={
            clarity === "beginner"
              ? "Start a new thread so this work stays separate."
              : "Start a fresh chat session."
          }
        >
          <span>
            <Button size="sm" onClick={onCreateThread}>
              New thread
            </Button>
          </span>
        </Tooltip>
      </div>

      <div className={styles["nn-sidebarList"]}>
        {threads.length === 0 ? (
          <div className={styles["nn-empty"]}>No sessions yet.</div>
        ) : (
          threads.map((thread) => (
            <Tooltip key={thread.id} text="Open this thread.">
              <button
                type="button"
                onClick={() => onSelectThread(thread.id)}
                className={[
                  styles["nn-threadItem"],
                  activeThreadId === thread.id ? styles["nn-threadActive"] : "",
                ].join(" ")}
              >
                <div className={styles["nn-threadTitle"]}>{thread.title}</div>
                <div className={styles["nn-threadMeta"]}>
                  <span>{formatTime(thread.updatedAt)}</span>
                  <span>{thread.messageCount} msg</span>
                </div>
              </button>
            </Tooltip>
          ))
        )}
      </div>
    </div>
  );
}
