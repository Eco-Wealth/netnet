#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findCockpitRoot, toRepoRelative } from "./lib/find-cockpit-root.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cockpitRoot = findCockpitRoot(repoRoot);

const matrixPath = path.join(cockpitRoot, "docs", "service-connector-matrix.md");
const envPath = path.join(cockpitRoot, ".env.example");
const mcpIndexPath = path.join(cockpitRoot, "src", "mcp", "index.ts");
const mcpTypesPath = path.join(cockpitRoot, "src", "mcp", "types.ts");
const mcpAdapterDir = path.join(cockpitRoot, "src", "mcp", "adapters");

const REQUIRED = [
  {
    id: "regen",
    matrixToken: "REGEN_MCP_URL",
    envKey: "REGEN_MCP_URL",
    typeChain: '"regen"',
    adapterFile: "regen.ts",
    indexToken: "new RegenAdapter()",
  },
  {
    id: "registry-review",
    matrixToken: "REGISTRY_REVIEW_MCP_URL",
    envKey: "REGISTRY_REVIEW_MCP_URL",
    typeChain: '"registry-review"',
    adapterFile: "registry-review.ts",
    indexToken: "new RegistryReviewAdapter()",
  },
  {
    id: "regen-koi",
    matrixToken: "REGEN_KOI_MCP_URL",
    envKey: "REGEN_KOI_MCP_URL",
    typeChain: '"regen-koi"',
    adapterFile: "regen-koi.ts",
    indexToken: "new RegenKoiAdapter()",
  },
  {
    id: "regen-python",
    matrixToken: "REGEN_PYTHON_MCP_URL",
    envKey: "REGEN_PYTHON_MCP_URL",
    typeChain: '"regen-python"',
    adapterFile: "regen-python.ts",
    indexToken: "new RegenPythonAdapter()",
  },
];

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`missing file: ${toRepoRelative(repoRoot, filePath)}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "utf8");
}

const matrixSource = readRequired(matrixPath);
const envSource = readRequired(envPath);
const mcpIndexSource = readRequired(mcpIndexPath);
const mcpTypesSource = readRequired(mcpTypesPath);

const rows = REQUIRED.map((item) => {
  const adapterPath = path.join(mcpAdapterDir, item.adapterFile);
  const adapterExists = fs.existsSync(adapterPath);
  const matrixOk = matrixSource.includes(item.matrixToken);
  const envOk = envSource.includes(item.envKey);
  const typeOk = mcpTypesSource.includes(item.typeChain);
  const indexOk = mcpIndexSource.includes(item.indexToken);
  const ok = adapterExists && matrixOk && envOk && typeOk && indexOk;
  return {
    id: item.id,
    adapterPath,
    matrixOk,
    envOk,
    typeOk,
    indexOk,
    adapterExists,
    ok,
  };
});

console.log("MCP connector integrity");
console.log(`- cockpit root: ${toRepoRelative(repoRoot, cockpitRoot)}`);
for (const row of rows) {
  console.log(
    `- ${row.ok ? "ok" : "fail"}: ${row.id} adapter=${row.adapterExists} matrix=${row.matrixOk} env=${row.envOk} types=${row.typeOk} index=${row.indexOk}`
  );
}

if (rows.some((row) => !row.ok)) {
  process.exit(1);
}

