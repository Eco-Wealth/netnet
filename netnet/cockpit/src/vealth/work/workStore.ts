import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../../data');
const STORE_FILE = path.join(DATA_DIR, 'workStore.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ items: [], events: {} }, null, 2));
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(STORE_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeStore(data: any) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

export function listWorkItems(filter: any = {}) {
  const store = readStore();
  let items = store.items || [];
  if (filter.owner) items = items.filter((i: any) => i.owner === filter.owner);
  if (filter.status) items = items.filter((i: any) => i.status === filter.status);
  return items;
}

export function createWorkItem(payload: any) {
  const store = readStore();
  const id = `W-${Date.now()}`;
  const item = { id, title: payload.title || '', description: payload.description || '', owner: payload.owner || null, tags: payload.tags || [], status: 'NEW', createdAt: new Date().toISOString() };
  store.items = store.items || [];
  store.items.push(item);
  writeStore(store);
  return item;
}

export function getWorkItem(id: string) {
  const store = readStore();
  return (store.items || []).find((i: any) => i.id === id) || null;
}

export function updateWorkStatus(id: string, status: string) {
  const store = readStore();
  const item = (store.items || []).find((i: any) => i.id === id);
  if (!item) return null;
  item.status = status;
  item.updatedAt = new Date().toISOString();
  writeStore(store);
  return item;
}

export function addWorkEvent(id: string, event: any) {
  const store = readStore();
  store.events = store.events || {};
  store.events[id] = store.events[id] || [];
  const e = { ...event, timestamp: new Date().toISOString() };
  store.events[id].push(e);
  writeStore(store);
  return e;
}

export default {
  listWorkItems,
  createWorkItem,
  getWorkItem,
  updateWorkStatus,
  addWorkEvent,
};
