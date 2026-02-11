/**
 * Unit U — API Contract Test Suite (scaffold)
 *
 * This file is intentionally "opt-in": it is NOT wired into CI by default.
 * Run locally (from netnet/cockpit):
 *   node --test tests/api_contracts_smoke.test.ts
 *
 * Requirements:
 * - Start the dev server in another terminal: npm run dev
 * - Ensure it is reachable at http://localhost:3000
 */

import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.NETNET_TEST_BASE_URL ?? "http://localhost:3000";

async function getJson(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { "accept": "application/json" } });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { res, text, json };
}

test("health endpoint", async () => {
  const { res, json, text } = await getJson("/api/health");
  assert.equal(res.ok, true, `Expected 200 OK, got ${res.status}: ${text}`);
  assert.equal(json?.ok, true);
  assert.ok(json?._obs, "Expected _obs metadata");
});

test("work list endpoint responds", async () => {
  const { res, json, text } = await getJson("/api/work");
  assert.equal(res.ok, true, `Expected 200 OK, got ${res.status}: ${text}`);
  assert.equal(json?.ok, true);
  assert.ok(Array.isArray(json?.items), "Expected items[]");
});

test("scan endpoint rejects bad hash", async () => {
  const { res } = await getJson("/api/ecotoken/scan?hash=0x123");
  assert.equal(res.status, 400);
});

test("trade info surface", async () => {
  const { res, json, text } = await getJson("/api/agent/trade?action=info");
  assert.equal(res.ok, true, `Expected 200 OK, got ${res.status}: ${text}`);
  assert.equal(json?.ok, true);
});
