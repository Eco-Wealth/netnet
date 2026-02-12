"use client";

import { Button } from "@/components/ui";
import styles from "@/components/operator/OperatorSeat.module.css";
import Tooltip from "@/components/operator/Tooltip";

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
}: ThreadSidebarProps) {
  return (
    <div className={styles["nn-columnBody"]}>
      <div className={styles["nn-sectionHeader"]}>
        <div>
          <div className={styles["nn-sectionTitle"]}>Threads</div>
          <div className={styles["nn-muted"]}>Conversation list</div>
        </div>
        <Tooltip text="Create a fresh conversation thread.">
          <span>
            <Button size="sm" onClick={onCreateThread}>
              New Thread
            </Button>
          </span>
        </Tooltip>
      </div>

      <div className={styles["nn-sidebarList"]}>
        {threads.length === 0 ? (
          <div className={styles["nn-empty"]}>No threads yet.</div>
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
