import { WorkEvent, WorkItem, WorkPriority, WorkStatus } from "./types";

function isoNow() {
  return new Date().toISOString();
}

function rid(prefix: string) {
  // short, sortable-enough id
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

const db = new Map<string, WorkItem>();

export type CreateWorkInput = {
  title: string;
  description?: string;
  kind?: WorkItem["kind"];
  acceptance?: string;
  slaHours?: number;
  tags?: string[];
  status?: WorkStatus;
  priority?: WorkPriority;
  owner?: string;
  links?: { label: string; url: string }[];
  data?: Record<string, unknown> | null;
};

export type UpdateWorkInput = Partial<Omit<WorkItem, "id" | "events" | "createdAt">>;

export function listWorkItems(): WorkItem[] {
  return Array.from(db.values()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getWorkItem(id: string): WorkItem | null {
  return db.get(id) ?? null;
}

export function createWorkItem(input: CreateWorkInput): WorkItem {
  const now = isoNow();
  const item: WorkItem = {
    id: rid("work"),
    title: input.title,
    description: input.description,
    kind: input.kind,
    acceptance: input.acceptance,
    sla: input.slaHours
      ? { hours: input.slaHours, dueAt: new Date(Date.now() + input.slaHours * 60 * 60 * 1000).toISOString() }
      : undefined,
    tags: input.tags ?? [],
    status: input.status ?? "PROPOSED",
    priority: input.priority ?? "MEDIUM",
    owner: input.owner,
    createdAt: now,
    updatedAt: now,
    events: [],
    links: input.links ?? [],
    data: input.data ?? null,
  };

  db.set(item.id, item);
  appendWorkEvent(item.id, {
    type: "NOTE",
    by: input.owner ?? "system",
    note: "Work item created.",
    patch: { title: item.title, status: item.status, priority: item.priority },
  });

  return db.get(item.id)!;
}

export function updateWorkItem(id: string, patch: UpdateWorkInput): WorkItem | null {
  const cur = db.get(id);
  if (!cur) return null;

  const next: WorkItem = {
    ...cur,
    ...patch,
    // keep immutable fields
    id: cur.id,
    createdAt: cur.createdAt,
    events: cur.events,
    updatedAt: isoNow(),
  };

  db.set(id, next);
  appendWorkEvent(id, {
    type: "PATCH",
    by: "system",
    note: "Work item updated.",
    patch: patch as Record<string, unknown>,
  });

  return db.get(id)!;
}

export type AppendEventInput = {
  type: WorkEvent["type"];
  by: string;
  note?: string;
  patch?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

export function appendWorkEvent(id: string, ev: AppendEventInput): WorkItem | null {
  const cur = db.get(id);
  if (!cur) return null;

  const event: WorkEvent = {
    id: rid("ev"),
    ts: isoNow(),
    type: ev.type,
    by: ev.by,
    note: ev.note,
    patch: ev.patch ?? null,
    meta: ev.meta ?? null,
  };

  const next: WorkItem = {
    ...cur,
    events: [event, ...(cur.events ?? [])],
    updatedAt: isoNow(),
  };

  db.set(id, next);
  return db.get(id)!;
}
