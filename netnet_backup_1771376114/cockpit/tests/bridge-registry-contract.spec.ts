import { expect, test } from "@playwright/test";
import { GET as bridgeRegistryGet } from "../src/app/api/bridge/registry/route";
import { resetBridgeClientCacheForTests } from "../src/lib/bridge/client";

test.describe.configure({ mode: "serial" });

const originalFetch = global.fetch;
const envBackup = {
  BRIDGE_API_BASE_URL: process.env.BRIDGE_API_BASE_URL,
  BRIDGE_ECO_API_BASE: process.env.BRIDGE_ECO_API_BASE,
  BRIDGE_TIMEOUT_MS: process.env.BRIDGE_TIMEOUT_MS,
};

test.afterEach(() => {
  global.fetch = originalFetch;
  resetBridgeClientCacheForTests();

  if (envBackup.BRIDGE_API_BASE_URL === undefined) delete process.env.BRIDGE_API_BASE_URL;
  else process.env.BRIDGE_API_BASE_URL = envBackup.BRIDGE_API_BASE_URL;

  if (envBackup.BRIDGE_ECO_API_BASE === undefined) delete process.env.BRIDGE_ECO_API_BASE;
  else process.env.BRIDGE_ECO_API_BASE = envBackup.BRIDGE_ECO_API_BASE;

  if (envBackup.BRIDGE_TIMEOUT_MS === undefined) delete process.env.BRIDGE_TIMEOUT_MS;
  else process.env.BRIDGE_TIMEOUT_MS = envBackup.BRIDGE_TIMEOUT_MS;
});

test("bridge registry returns normalized timeout error", async () => {
  process.env.BRIDGE_API_BASE_URL = "https://bridge.invalid";
  process.env.BRIDGE_TIMEOUT_MS = "10";
  resetBridgeClientCacheForTests();

  global.fetch = (async () => {
    throw new DOMException("The operation was aborted.", "AbortError");
  }) as any;

  const res = await bridgeRegistryGet();
  const body = await res.json();

  expect(res.status).toBe(504);
  expect(body.ok).toBe(false);
  expect(body.error?.code).toBe("UPSTREAM_TIMEOUT");
  expect(body.error?.details?.source).toBe("bridge.registry");
  expect(body.error?.details?.retryable).toBe(true);
});

test("bridge registry returns normalized bad gateway error", async () => {
  process.env.BRIDGE_API_BASE_URL = "https://bridge.invalid";
  process.env.BRIDGE_TIMEOUT_MS = "10";
  resetBridgeClientCacheForTests();

  global.fetch = (async () =>
    new Response(JSON.stringify({ error: "bridge failure" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    })) as any;

  const res = await bridgeRegistryGet();
  const body = await res.json();

  expect(res.status).toBe(502);
  expect(body.ok).toBe(false);
  expect(body.error?.code).toBe("UPSTREAM_BAD_GATEWAY");
  expect(body.error?.details?.source).toBe("bridge.registry");
  expect(body.error?.details?.retryable).toBe(true);
});

test("bridge registry returns data when upstream succeeds", async () => {
  process.env.BRIDGE_API_BASE_URL = "https://bridge.invalid";
  resetBridgeClientCacheForTests();

  global.fetch = (async () =>
    new Response(JSON.stringify({ projects: [{ id: "p1", name: "demo" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as any;

  const res = await bridgeRegistryGet();
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.ok).toBe(true);
  expect(body.degraded).toBe(false);
  expect(body.source).toBe("bridge.registry");
  expect(body.data?.projects?.length).toBe(1);
});
