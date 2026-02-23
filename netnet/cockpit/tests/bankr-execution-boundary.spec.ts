import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("bankr launch rejects invalid body at execution boundary", async ({ request }) => {
  const res = await request.post("/api/bankr/launch", {
    data: {
      name: "",
      symbol: "",
      chain: "",
    },
  });
  const body = await res.json();

  expect(res.status()).toBe(400);
  expect(body.ok).toBe(false);
  expect(body.error?.code).toBe("BAD_REQUEST");
});

test("execute_privy requires walletProfileId", async ({ request }) => {
  const res = await request.post("/api/bankr/token/actions", {
    data: {
      action: "execute_privy",
      params: {
        transaction: {
          to: "0x1111111111111111111111111111111111111111",
        },
      },
    },
  });
  const body = await res.json();

  expect(res.status()).toBe(400);
  expect(body.ok).toBe(false);
  expect(body.error?.code).toBe("MISSING_WALLET_PROFILE");
});

test("execute_privy rejects unknown wallet profile", async ({ request }) => {
  const res = await request.post("/api/bankr/token/actions", {
    data: {
      action: "execute_privy",
      params: {
        walletProfileId: "unknown-wallet-profile",
        transaction: {
          to: "0x1111111111111111111111111111111111111111",
        },
      },
    },
  });
  const body = await res.json();

  expect(res.status()).toBe(400);
  expect(body.ok).toBe(false);
  expect(body.error?.code).toBe("UNKNOWN_WALLET_PROFILE");
});
