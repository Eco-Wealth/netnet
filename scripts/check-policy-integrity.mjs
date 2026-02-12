#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const decidePath = path.join(
  repoRoot,
  "netnet/cockpit/src/lib/policy/decide.ts"
);
const enforcePath = path.join(
  repoRoot,
  "netnet/cockpit/src/lib/policy/enforce.ts"
);
const typesPath = path.join(
  repoRoot,
  "netnet/cockpit/src/lib/policy/types.ts"
);

function mustContain(src, pattern, why) {
  if (!pattern.test(src)) {
    throw new Error(`missing check: ${why}`);
  }
}

const decideSrc = fs.readFileSync(decidePath, "utf8");
const enforceSrc = fs.readFileSync(enforcePath, "utf8");
const typesSrc = fs.readFileSync(typesPath, "utf8");

const checks = [];
function check(fn) {
  try {
    fn();
    checks.push({ ok: true, label: fn.name || "check" });
  } catch (err) {
    checks.push({ ok: false, label: fn.name || "check", error: String(err.message || err) });
  }
}

check(function shared_types_are_declared() {
  mustContain(typesSrc, /export type EnforcePolicyContext\s*=\s*{/, "EnforcePolicyContext in types.ts");
  mustContain(typesSrc, /export type SpendPolicyEnvelope\s*=\s*{/, "SpendPolicyEnvelope in types.ts");
  mustContain(typesSrc, /export type PolicyDecision\s*=\s*{/, "PolicyDecision in types.ts");
});

check(function enforce_uses_decide_model() {
  mustContain(enforceSrc, /import\s+\{\s*decide,\s*programForAction\s*\}\s+from\s+"\.\/decide"/, "enforce imports decide/programForAction");
  mustContain(enforceSrc, /import\s+\{\s*loadPolicyConfig\s*\}\s+from\s+"\.\/config"/, "enforce imports loadPolicyConfig");
  mustContain(
    enforceSrc,
    /const\s+programId\s*=\s*programForAction\((action|effectiveAction)\)/,
    "enforce maps action -> program"
  );
  mustContain(enforceSrc, /const\s+decision\s*=\s*decide\(/, "enforce delegates to decide");
});

check(function decide_covers_autonomy_levels() {
  mustContain(decideSrc, /program\.autonomy\s*===\s*"READ_ONLY"\)\s*mode\s*=\s*"BLOCK"/, "READ_ONLY => BLOCK");
  mustContain(decideSrc, /program\.autonomy\s*===\s*"PROPOSE_ONLY"\)\s*mode\s*=\s*"REQUIRE_APPROVAL"/, "PROPOSE_ONLY => REQUIRE_APPROVAL");
  mustContain(decideSrc, /program\.autonomy\s*===\s*"EXECUTE_WITH_LIMITS"\)\s*mode\s*=\s*"REQUIRE_APPROVAL"/, "EXECUTE_WITH_LIMITS => REQUIRE_APPROVAL");
});

check(function bankr_namespace_is_mapped() {
  mustContain(decideSrc, /if\s*\(action\.startsWith\("bankr\."\)\)\s*return\s*"TOKEN_OPS"/, "programForAction maps bankr.* to TOKEN_OPS");
  mustContain(typesSrc, /"bankr\.wallet\.read"/, "PolicyAction includes bankr.wallet.read");
  mustContain(typesSrc, /"bankr\.token\.info"/, "PolicyAction includes bankr.token.info");
  mustContain(typesSrc, /"bankr\.token\.actions"/, "PolicyAction includes bankr.token.actions");
  mustContain(typesSrc, /"bankr\.launch"/, "PolicyAction includes bankr.launch");
});

const failed = checks.filter((c) => !c.ok);

console.log("Policy integrity check");
for (const c of checks) {
  if (c.ok) console.log(`- ok: ${c.label}`);
  else console.log(`- fail: ${c.label} (${c.error})`);
}

if (failed.length) {
  process.exit(1);
}
