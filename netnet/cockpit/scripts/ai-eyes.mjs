#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cockpitRoot = path.resolve(__dirname, "..");

const PORT = String(process.env.AI_EYES_PORT || "3101").trim();
const BASE_URL = String(
  process.env.AI_EYES_BASE_URL || `http://127.0.0.1:${PORT}`
).trim();
const FAIL_ON_ISSUE = process.env.AI_EYES_FAIL_ON_ISSUE !== "0";
const AUTO_START_DEV = process.env.AI_EYES_AUTO_START_DEV !== "0";
const OUT_DIR = path.resolve(
  process.env.AI_EYES_OUT_DIR || path.join(cockpitRoot, "test-results", "ai-eyes")
);

const ROUTES = [
  {
    id: "operator",
    path: "/operator",
    requiredSelectors: [
      "h1:has-text('Operator')",
      "button:has-text('Send')",
      "textarea",
      "text=Start here",
    ],
    interaction: "operatorComposer",
  },
  {
    id: "work",
    path: "/work",
    requiredSelectors: [
      "h1:has-text('Work')",
      "button:has-text('Create Work Item')",
      "input[placeholder*='title']",
    ],
  },
  {
    id: "proof",
    path: "/proof",
    requiredSelectors: [
      "h1:has-text('Proof')",
      "button:has-text('Build proof')",
      "select",
    ],
  },
  {
    id: "ops-control",
    path: "/ops/control",
    requiredSelectors: [
      "h1:has-text('Ops Control Center')",
      "text=Control Center",
      "button:has-text('Approve All')",
      "button:has-text('Run')",
    ],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readText(url) {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return { status: res.status, text, contentType: res.headers.get("content-type") || "" };
}

function looksLikeCockpitHtml(payload) {
  return (
    payload.status === 200 &&
    payload.contentType.includes("text/html") &&
    payload.text.includes("netnet cockpit")
  );
}

function isAuthGate(payload) {
  return payload.text.includes("Bearer token is required");
}

async function waitForCockpit(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const payload = await readText(url);
      if (looksLikeCockpitHtml(payload)) return payload;
    } catch {
      // keep polling
    }
    await sleep(1000);
  }
  return null;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeMarkdown(file, lines) {
  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
}

function toHeading(text) {
  return text ? text.trim().replace(/\s+/g, " ") : "";
}

function summaryStatus(results) {
  return results.every((result) => result.ok) ? "PASS" : "FAIL";
}

async function run() {
  ensureDir(OUT_DIR);

  const operatorUrl = `${BASE_URL}/operator`;
  let preflight = null;
  let devProc = null;
  let startedDev = false;

  try {
    try {
      preflight = await readText(operatorUrl);
    } catch {
      preflight = null;
    }

    const cockpitReady = preflight ? looksLikeCockpitHtml(preflight) : false;
    if (!cockpitReady && AUTO_START_DEV) {
      devProc = spawn("npm", ["run", "dev"], {
        cwd: cockpitRoot,
        env: { ...process.env, PORT },
        stdio: ["ignore", "pipe", "pipe"],
      });
      startedDev = true;
      const logFile = path.join(OUT_DIR, "dev.log");
      const stream = fs.createWriteStream(logFile, { flags: "a" });
      devProc.stdout.on("data", (chunk) => stream.write(chunk));
      devProc.stderr.on("data", (chunk) => stream.write(chunk));
      const ready = await waitForCockpit(operatorUrl);
      if (!ready) {
        throw new Error(
          `ai_eyes_dev_not_ready: cockpit unavailable at ${operatorUrl}. Check ${logFile}`
        );
      }
      preflight = ready;
    }

    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders:
        process.env.AI_EYES_BEARER && process.env.AI_EYES_BEARER.trim()
          ? { Authorization: `Bearer ${process.env.AI_EYES_BEARER.trim()}` }
          : {},
    });
    const page = await context.newPage();

    const results = [];
    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      const routeResult = {
        id: route.id,
        path: route.path,
        url,
        ok: true,
        heading: "",
        buttons: 0,
        inputs: 0,
        missingSelectors: [],
        screenshots: [],
        authGate: false,
      };

      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
        await page.waitForTimeout(700);

        const bodyText = (await page.locator("body").innerText().catch(() => "")) || "";
        if (bodyText.includes("Bearer token is required")) {
          routeResult.ok = false;
          routeResult.authGate = true;
        }

        routeResult.heading = toHeading(
          await page.locator("h1").first().textContent().catch(() => "")
        );
        routeResult.buttons = await page.locator("button").count();
        routeResult.inputs = await page.locator("input,textarea,select").count();

        for (const selector of route.requiredSelectors) {
          const visible = await page.locator(selector).first().isVisible().catch(() => false);
          if (!visible) {
            routeResult.ok = false;
            routeResult.missingSelectors.push(selector);
          }
        }

        const baseShot = path.join(OUT_DIR, `${route.id}.png`);
        await page.screenshot({ path: baseShot, fullPage: true });
        routeResult.screenshots.push(baseShot);

        if (route.interaction === "operatorComposer") {
          const composer = page.locator("textarea").first();
          const send = page.locator("button:has-text('Send')").first();
          const composerVisible = await composer.isVisible().catch(() => false);
          const sendVisible = await send.isVisible().catch(() => false);
          if (!composerVisible || !sendVisible) {
            routeResult.ok = false;
          } else {
            await composer.click();
            await composer.fill("AI-eyes smoke: composer is clickable");
            const interactedShot = path.join(OUT_DIR, `${route.id}-interacted.png`);
            await page.screenshot({ path: interactedShot, fullPage: true });
            routeResult.screenshots.push(interactedShot);
          }
        }
      } catch (error) {
        routeResult.ok = false;
        routeResult.error = error instanceof Error ? error.message : String(error);
      }

      results.push(routeResult);
    }

    await context.close();
    await browser.close();

    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      port: PORT,
      startedDev,
      preflight: preflight
        ? {
            status: preflight.status,
            contentType: preflight.contentType,
            cockpitReady: looksLikeCockpitHtml(preflight),
            authGateDetected: isAuthGate(preflight),
          }
        : null,
      results,
      status: summaryStatus(results),
    };

    const reportJson = path.join(OUT_DIR, "report.json");
    writeJson(reportJson, report);

    const md = [];
    md.push("# AI Eyes Report");
    md.push("");
    md.push(`- Status: **${report.status}**`);
    md.push(`- Base URL: \`${BASE_URL}\``);
    md.push(`- Generated: \`${report.generatedAt}\``);
    md.push(`- Started local dev: \`${startedDev}\``);
    md.push("");
    md.push("| Route | OK | Heading | Buttons | Inputs | Missing selectors |");
    md.push("| --- | --- | --- | ---: | ---: | --- |");
    for (const row of results) {
      md.push(
        `| ${row.path} | ${row.ok ? "yes" : "no"} | ${row.heading || "-"} | ${row.buttons} | ${row.inputs} | ${
          row.missingSelectors.length ? row.missingSelectors.join(", ") : "-"
        } |`
      );
    }
    md.push("");
    md.push("## Screenshots");
    for (const row of results) {
      for (const shot of row.screenshots) {
        md.push(`- ${row.path}: \`${shot}\``);
      }
    }
    const reportMd = path.join(OUT_DIR, "report.md");
    writeMarkdown(reportMd, md);

    console.log(`AI Eyes status: ${report.status}`);
    console.log(`AI Eyes report: ${reportJson}`);
    console.log(`AI Eyes markdown: ${reportMd}`);

    if (FAIL_ON_ISSUE && report.status !== "PASS") {
      process.exit(1);
    }
  } finally {
    if (devProc && !devProc.killed) {
      devProc.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
