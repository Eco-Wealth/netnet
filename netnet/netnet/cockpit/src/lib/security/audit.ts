export type SecurityCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail?: string;
  remediation?: string;
};

export type SecurityAudit = {
  ok: boolean;
  ts: string;
  checks: SecurityCheck[];
  summary: {
    pass: number;
    warn: number;
    fail: number;
    total: number;
  };
};

function envPresent(name: string): boolean {
  return Boolean(process.env[name] && String(process.env[name]).trim().length > 0);
}

export function runSecurityAudit(): SecurityAudit {
  const checks: SecurityCheck[] = [];

  // Basic environment sanity (safe defaults; no secrets returned)
  const requiredEnv = [
    "NODE_ENV",
  ];

  for (const key of requiredEnv) {
    checks.push({
      id: `env.${key}`,
      label: `Env var present: ${key}`,
      status: envPresent(key) ? "pass" : "warn",
      detail: envPresent(key) ? "set" : "not set",
      remediation: envPresent(key) ? undefined : `Set ${key} in your runtime environment (.env.local / container env).`,
    });
  }

  // Optional-but-important config hints
  const optionalEnv = [
    "BRIDGE_API_BASE_URL",
    "X402_ENABLED",
    "X402_DEV_BYPASS",
    "BANKR_API_BASE_URL",
    "NETNET_AUTONOMY_LEVEL",
  ];

  for (const key of optionalEnv) {
    checks.push({
      id: `env.opt.${key}`,
      label: `Optional env var: ${key}`,
      status: envPresent(key) ? "pass" : "warn",
      detail: envPresent(key) ? "set" : "not set",
      remediation: envPresent(key) ? undefined : `If you use this feature, set ${key}.`,
    });
  }

  // Guardrail: Autonomy level should not default to EXECUTE
  const autonomy = (process.env.NETNET_AUTONOMY_LEVEL || "PROPOSE_ONLY").toUpperCase();
  const autonomyOk = ["READ_ONLY","PROPOSE_ONLY","EXECUTE_WITH_LIMITS"].includes(autonomy);
  const autonomySafe = autonomy !== "EXECUTE_WITH_LIMITS"; // warn if execution enabled
  checks.push({
    id: "policy.autonomy",
    label: "Autonomy level safe-by-default",
    status: autonomyOk ? (autonomySafe ? "pass" : "warn") : "fail",
    detail: autonomyOk ? autonomy : `invalid: ${autonomy}`,
    remediation: autonomyOk
      ? (autonomySafe ? undefined : "Execution is enabled. Confirm caps/allowlists and kill-switch wiring before production.")
      : "Set NETNET_AUTONOMY_LEVEL to READ_ONLY, PROPOSE_ONLY, or EXECUTE_WITH_LIMITS.",
  });

  // Guardrail: x402 enabled should not crash without headers (handled by code; still surface config)
  const x402Enabled = (process.env.X402_ENABLED || "").toLowerCase() in {"1":1,"true":1,"yes":1};
  checks.push({
    id: "x402.config",
    label: "x402 configuration present when enabled",
    status: x402Enabled ? "warn" : "pass",
    detail: x402Enabled ? "enabled (validate pay-to/network are configured)" : "disabled",
    remediation: x402Enabled ? "Set x402 pay-to/network vars and test /api/proof-paid returns 402 with proper headers." : undefined,
  });

  const summary = checks.reduce((acc, c) => {
    acc[c.status] += 1;
    acc.total += 1;
    return acc;
  }, {pass:0, warn:0, fail:0, total:0} as any);

  const ok = summary.fail === 0;
  return {
    ok,
    ts: new Date().toISOString(),
    checks,
    summary,
  };
}
