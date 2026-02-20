import * as fs from "fs";
import * as path from "path";

const STORE_DIR = path.join(__dirname);
const STORE_FILE = path.join(STORE_DIR, "workItems.json");

type Status = "NEW" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  owner: string;
  tags: string[];
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface WorkEvent {
  id: string;
  workId: string;
  type: "COMMENT" | "APPROVAL_REQUESTED";
  message: string;
  actor: string;
  createdAt: string;
}

interface StoreShape {
  workItems: WorkItem[];
  workEvents: WorkEvent[];
}

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    const initial: StoreShape = { workItems: [], workEvents: [] };
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), { encoding: "utf8" });
  }
}

function readStore(): StoreShape {
  ensureStore();
  const raw = fs.readFileSync(STORE_FILE, { encoding: "utf8" });
  return JSON.parse(raw) as StoreShape;
}

function writeStore(store: StoreShape) {
  // Atomic-ish write: write to temp then rename
  const tmp = STORE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { encoding: "utf8" });
  fs.renameSync(tmp, STORE_FILE);
}

export function listWorkItems(filter?: { owner?: string; status?: Status }) {
  const store = readStore();
  let items = store.workItems.slice();
  if (filter?.owner) items = items.filter((i) => i.owner === filter.owner);
  if (filter?.status) items = items.filter((i) => i.status === filter.status);
  return items;
}

export function getWorkItem(id: string) {
  const store = readStore();
  return store.workItems.find((w) => w.id === id) || null;
}

export function createWorkItem(data: { title: string; description: string; owner: string; tags?: string[] }) {
  const now = "2026-02-17T03:00:00.000Z"; // fixed timestamp for determinism
  const id = `work_${Date.now()}`;
  const item: WorkItem = {
    id,
    title: data.title,
    description: data.description,
    owner: data.owner,
    tags: data.tags || [],
    status: "NEW",
    createdAt: now,
    updatedAt: now,
  };
  const store = readStore();
  store.workItems.push(item);
  writeStore(store);
  return item;
}

export function updateWorkStatus(id: string, status: Status) {
  const store = readStore();
  const item = store.workItems.find((w) => w.id === id);
  if (!item) return null;
  item.status = status;
  item.updatedAt = "2026-02-17T03:00:00.000Z";
  writeStore(store);
  return item;
}

export function addWorkEvent(workId: string, eventData: { type: "COMMENT" | "APPROVAL_REQUESTED"; message: string; actor: string }) {
  const store = readStore();
  const work = store.workItems.find((w) => w.id === workId);
  if (!work) return null;
  const id = `event_${Date.now()}`;
  const ev: WorkEvent = { id, workId, type: eventData.type, message: eventData.message, actor: eventData.actor, createdAt: "2026-02-17T03:00:00.000Z" };
  store.workEvents.push(ev);
  writeStore(store);
  return ev;
}
