import { expect, test } from "@playwright/test";
import { GET as proofPaidGet } from "../src/app/api/proof-paid/route";

test.describe.configure({ mode: "serial" });

const PAY_TO = "0x1111111111111111111111111111111111111111";
const DEV_TOKEN = "netnet-local-paid-token";
const envBackup = {
  X402_PAY_TO: process.env.X402_PAY_TO,
  X402_DEV_BYPASS: process.env.X402_DEV_BYPASS,
  X402_DEV_PAID_TOKEN: process.env.X402_DEV_PAID_TOKEN,
};

test.afterEach(() => {
  if (envBackup.X402_PAY_TO === undefined) delete process.env.X402_PAY_TO;
  else process.env.X402_PAY_TO = envBackup.X402_PAY_TO;

  if (envBackup.X402_DEV_BYPASS === undefined) delete process.env.X402_DEV_BYPASS;
  else process.env.X402_DEV_BYPASS = envBackup.X402_DEV_BYPASS;

  if (envBackup.X402_DEV_PAID_TOKEN === undefined) delete process.env.X402_DEV_PAID_TOKEN;
  else process.env.X402_DEV_PAID_TOKEN = envBackup.X402_DEV_PAID_TOKEN;
});

test("GET /api/proof-paid returns 402 when unpaid", async ({ request }) => {
  const res = await request.get("/api/proof-paid");
  const body = await res.json();

  expect(res.status()).toBe(402);
  expect(body.ok).toBe(false);
  expect(body.error?.code).toBe("PAYMENT_REQUIRED");
  expect(res.headers()["x402-pay-to"]).toBe(PAY_TO);
});

test("GET /api/proof-paid returns 200 when local paid token is sent", async ({ request }) => {
  const res = await request.get("/api/proof-paid", {
    headers: {
      "x-netnet-paid-token": DEV_TOKEN,
    },
  });
  const body = await res.json();

  expect(res.status()).toBe(200);
  expect(body.ok).toBe(true);
  expect(body.paid).toBe(true);
  expect(body.mode).toBe("dev_token");
});

test("proof-paid route returns 503 when X402_PAY_TO is missing", async () => {
  process.env.X402_DEV_BYPASS = "false";
  process.env.X402_DEV_PAID_TOKEN = "";
  delete process.env.X402_PAY_TO;

  const res = await proofPaidGet(new Request("http://localhost/api/proof-paid"));
  const body = await res.json();

  expect(res.status).toBe(503);
  expect(body.ok).toBe(false);
  expect(body.error?.code).toBe("X402_NOT_CONFIGURED");
});
