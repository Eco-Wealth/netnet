export type WorkStatus =
  | "OPEN"
  | "PROPOSED"
  | "READY"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "DONE"
  | "CANCELED";

export type WorkPriority = "LOW" | "MED" | "MEDIUM" | "HIGH" | "CRIT" | "CRITICAL";

export type WorkEventType =
  | "NOTE"
  | "PROPOSAL"
  | "APPROVAL"
  | "EXECUTION"
  | "ERROR"
  | "PATCH";

export type WorkEvent = {
  id: string;
  ts: string; // ISO
  type: WorkEventType;
  by: string; // "agent" | "operator" | ...
  note?: string;
  patch?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

export type WorkItem = {
  id: string;
  title: string;
  description?: string;
  kind?: "TASK" | "BUG" | "RESEARCH" | "DOCS" | string;
  acceptance?: string;
  sla?: { hours?: number; dueAt?: string };
  tags?: string[];
  status: WorkStatus;
  priority: WorkPriority;
  owner?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  events: WorkEvent[];
  links?: { label: string; url: string }[];
  data?: Record<string, unknown> | null;
};
