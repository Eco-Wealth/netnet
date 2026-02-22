#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);
const matrixPath = path.join(cockpitRoot, "docs", "service-connector-matrix.md");

const CONNECTORS = [
  { id: "bankr.wallet", route: "/api/bankr/wallet", kind: "internal" },
  { id: "bankr.token.info", route: "/api/bankr/token/info", kind: "internal" },
  { id: "bankr.token.actions", route: "/api/bankr/token/actions", kind: "internal" },
  { id: "bankr.launch", route: "/api/bankr/launch", kind: "internal" },
  { id: "telegram.webhook", route: "/api/telegram/webhook", kind: "internal" },
  { id: "bridge.quote", route: "/api/bridge/quote", kind: "internal" },
  { id: "bridge.retire", route: "/api/bridge/retire", kind: "internal" },
  { id: "proof.feed", route: "/api/proof/feed", kind: "internal" },
] as const;

function routeToFile(route) {
  const trimmed = String(route || "").trim();
  if (!trimmed.startsWith("/api/")) return null;
  const relative = trimmed.slice(1);
  return path.join(cockpitRoot, "src", "app", relative, "route.ts");
}

function checkConnector(connector, matrixSource) {
  const inMatrix = matrixSource.includes(connector.route);
  const routeFile = routeToFile(connector.route);
  const routeExists = routeFile ? fs.existsSync(routeFile) : true;
  return {
    ...connector,
    inMatrix,
    routeFile,
    routeExists,
    ok: inMatrix && routeExists,
  };
}

if (!fs.existsSync(matrixPath)) {
  console.error(`missing service connector matrix: ${toRepoRelative(repoRoot, matrixPath)}`);
  process.exit(1);
}

const matrixSource = fs.readFileSync(matrixPath, "utf8");
const rows = CONNECTORS.map((connector) => checkConnector(connector, matrixSource));
const failed = rows.filter((row) => !row.ok);

console.log("Service connector health");
console.log(`- cockpit root: ${toRepoRelative(repoRoot, cockpitRoot)}`);
console.log(`- matrix: ${toRepoRelative(repoRoot, matrixPath)}`);
for (const row of rows) {
  const routeFile = row.routeFile
    ? toRepoRelative(repoRoot, row.routeFile)
    : "n/a";
  console.log(
    `- ${row.ok ? "ok" : "fail"}: ${row.id} (${row.route}) matrix=${row.inMatrix} route=${routeFile} exists=${row.routeExists}`
  );
}

if (failed.length > 0) {
  process.exit(1);
}
