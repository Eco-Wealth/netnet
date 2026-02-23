import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("bankr token info endpoint returns read-only payload", async ({ request }) => {
  const res = await request.get("/api/bankr/token/info");
  const body = await res.json();

  expect(res.status()).toBe(200);
  expect(body.ok).toBe(true);
  expect(body.provider).toBe("bankr");
  expect(body.mode).toBe("READ_ONLY");
});

test("bankr token actions endpoint serves propose-only catalog", async ({ request }) => {
  const res = await request.get("/api/bankr/token/actions");
  const body = await res.json();

  expect(res.status()).toBe(200);
  expect(body.ok).toBe(true);
  expect(body.execution?.mode).toBe("PROPOSE_ONLY");
  expect(Array.isArray(body.actions)).toBe(true);
  expect(body.actions.some((action: { action?: string }) => action.action === "execute_privy")).toBe(true);
});

test("bankr token actions rejects unknown action", async ({ request }) => {
  const res = await request.post("/api/bankr/token/actions", {
    data: {
      action: "unknown_action",
      params: {},
    },
  });
  const body = await res.json();

  expect(res.status()).toBe(400);
  expect(body.ok).toBe(false);
  expect(body.error?.code).toBe("UNKNOWN_ACTION");
});

test("bankr wallet endpoint returns deterministic mock lane in test env", async ({ request }) => {
  const res = await request.get("/api/bankr/wallet", {
    params: {
      action: "state",
      wallet: "0x1111111111111111111111111111111111111111",
    },
  });
  const body = await res.json();

  expect(res.status()).toBe(200);
  expect(body.ok).toBe(true);
  expect(body.wallet).toBe("0x1111111111111111111111111111111111111111");
  expect(
    typeof body.note === "string" &&
      (body.note.includes("mock data") || body.note.includes("mock"))
  ).toBe(true);
});
