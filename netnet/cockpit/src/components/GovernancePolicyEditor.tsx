"use client";

/**
 * GovernancePolicyEditor (Unit J)
 * Tight, operator-first governance controls with hover/tap insight.
 * Safe-by-default: edits only affect the policy API; no direct execution.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Button, Input } from "@/components/ui";

type AutonomyLevel = "READ_ONLY" | "PROPOSE_ONLY" | "EXECUTE_WITH_LIMITS";

type Policy = {
  autonomyLevel: AutonomyLevel;
  maxUsdPerDay: number;
  maxUsdPerTrade: number;
  slippageBps: number;
  allowlistTokens: string[];
  allowlistVenues: string[];
  allowlistActions: string[];
  killSwitchExecution: boolean;
  killSwitchSpend: boolean;
};

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok?: false; error: string };

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data as T;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data as T;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseCsvList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function csvList(a: string[]) {
  return (a || []).join(", ");
}

function Card(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight">{props.title}</div>
          {props.subtitle ? (
            <div className="mt-0.5 text-xs text-white/60">{props.subtitle}</div>
          ) : null}
        </div>
      </div>
      <div className="mt-3">{props.children}</div>
    </section>
  );
}

function Pill(props: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={props.title}
      className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/80"
    >
      {props.children}
    </span>
  );
}

function MiniHelp(props: { title: string; children: React.ReactNode }) {
  return (
    <span
      title={props.title}
      className="cursor-help select-none rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-white/70 hover:bg-white/[0.06]"
    >
      {props.children}
    </span>
  );
}

function ToggleRow(props: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{props.label}</span>
          <MiniHelp title={props.help}>?</MiniHelp>
        </div>
      </div>
      <Input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="h-4 w-4 accent-white"
      />
    </label>
  );
}

function NumberRow(props: {
  label: string;
  help: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const { min = 0, max = 1_000_000, step = 1, suffix } = props;
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">{props.label}</div>
          <MiniHelp title={props.help}>?</MiniHelp>
        </div>
        <div className="text-xs text-white/60">{suffix || ""}</div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Input
          type="number"
          value={Number.isFinite(props.value) ? props.value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => props.onChange(clamp(Number(e.target.value || 0), min, max))}
          className="w-full bg-black/20"
        />
      </div>
    </div>
  );
}

function TextRow(props: {
  label: string;
  help: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium">{props.label}</div>
        <MiniHelp title={props.help}>?</MiniHelp>
      </div>
      <div className="mt-2">
        <Input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className="w-full bg-black/20 placeholder:text-white/30"
        />
      </div>
    </div>
  );
}

export default function GovernancePolicyEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [policy, setPolicy] = useState<Policy>({
    autonomyLevel: "PROPOSE_ONLY",
    maxUsdPerDay: 25,
    maxUsdPerTrade: 10,
    slippageBps: 50,
    allowlistTokens: [],
    allowlistVenues: [],
    allowlistActions: [],
    killSwitchExecution: false,
    killSwitchSpend: false,
  });

  const [tokensCsv, setTokensCsv] = useState("");
  const [venuesCsv, setVenuesCsv] = useState("");
  const [actionsCsv, setActionsCsv] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await getJSON<ApiOk<{ policy: Policy }> | ApiErr>("/api/policy");
        if (!("ok" in data) || !data.ok) throw new Error((data as ApiErr).error || "Failed to load policy");
        setPolicy(data.policy);
        setTokensCsv(csvList(data.policy.allowlistTokens || []));
        setVenuesCsv(csvList(data.policy.allowlistVenues || []));
        setActionsCsv(csvList(data.policy.allowlistActions || []));
      } catch (e: any) {
        setErr(e?.message || "Failed to load policy");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const badges = useMemo(() => {
    const a = policy.autonomyLevel;
    const ks = policy.killSwitchExecution || policy.killSwitchSpend;
    return {
      autonomy: a === "READ_ONLY" ? "Read-only" : a === "PROPOSE_ONLY" ? "Propose-only" : "Execute (capped)",
      ks: ks ? "Kill-switch ON" : "Kill-switch OFF",
    };
  }, [policy.autonomyLevel, policy.killSwitchExecution, policy.killSwitchSpend]);

  async function save() {
    try {
      setSaving(true);
      setErr(null);
      setOkMsg(null);

      const next: Policy = {
        ...policy,
        allowlistTokens: parseCsvList(tokensCsv),
        allowlistVenues: parseCsvList(venuesCsv),
        allowlistActions: parseCsvList(actionsCsv),
      };

      const data = await postJSON<ApiOk<{ policy: Policy }> | ApiErr>("/api/policy", { policy: next });
      if (!("ok" in data) || !data.ok) throw new Error((data as ApiErr).error || "Failed to save policy");

      setPolicy(data.policy);
      setOkMsg("Saved.");
      setTimeout(() => setOkMsg(null), 1500);
    } catch (e: any) {
      setErr(e?.message || "Failed to save policy");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
        Loading policy…
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
        <div className="min-w-0">
          <div className="text-base font-semibold tracking-tight">Governance</div>
          <div className="mt-0.5 text-xs text-white/60">
            Operator-first safety envelope. Hover (?) for constraints and impacts.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Pill title="Current autonomy mode">{badges.autonomy}</Pill>
          <Pill title="Emergency kill switches for execution/spend">{badges.ks}</Pill>
          <Button
            onClick={save}
            disabled={saving}
            size="sm"
            title="Persist policy to /api/policy. This does not execute trades; it changes what the system will allow."
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
          {err}
        </div>
      ) : null}
      {okMsg ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          {okMsg}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Card
          title="Autonomy level"
          subtitle="Sets how far the system may go without additional operator approval."
        >
          <div className="grid gap-2">
            {(["READ_ONLY", "PROPOSE_ONLY", "EXECUTE_WITH_LIMITS"] as AutonomyLevel[]).map((lvl) => (
              <label
                key={lvl}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2"
                title={
                  lvl === "READ_ONLY"
                    ? "No state-changing actions. Safe for exploration."
                    : lvl === "PROPOSE_ONLY"
                      ? "May plan/propose actions but must require explicit approval for execution."
                      : "May execute within caps/allowlists. Use kill-switches and strict limits."
                }
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {lvl === "READ_ONLY"
                      ? "READ_ONLY"
                      : lvl === "PROPOSE_ONLY"
                        ? "PROPOSE_ONLY"
                        : "EXECUTE_WITH_LIMITS"}
                  </div>
                  <div className="mt-0.5 text-xs text-white/60">
                    {lvl === "READ_ONLY"
                      ? "Explore only. No spend, no signing."
                      : lvl === "PROPOSE_ONLY"
                        ? "Plans + proof packets. Execution requires approval."
                        : "Exec allowed inside caps + allowlists."}
                  </div>
                </div>
                <Input
                  type="radio"
                  name="autonomyLevel"
                  checked={policy.autonomyLevel === lvl}
                  onChange={() => setPolicy((p) => ({ ...p, autonomyLevel: lvl }))}
                  className="mt-1 h-4 w-4 accent-white"
                />
              </label>
            ))}
          </div>
        </Card>

        <Card
          title="Kill switches"
          subtitle="Hard stops. Use these when you need immediate containment."
        >
          <div className="grid gap-2">
            <ToggleRow
              label="Kill execution"
              help="Blocks any action classified as execution (broadcast/sign/retire/transfer). Proposals still allowed."
              checked={policy.killSwitchExecution}
              onChange={(v) => setPolicy((p) => ({ ...p, killSwitchExecution: v }))}
            />
            <ToggleRow
              label="Kill spend"
              help="Blocks actions that would spend fees/tokens. Use when budget is at risk."
              checked={policy.killSwitchSpend}
              onChange={(v) => setPolicy((p) => ({ ...p, killSwitchSpend: v }))}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card title="Caps" subtitle="Hard numeric limits enforced by the policy engine.">
          <div className="grid gap-2">
            <NumberRow
              label="Max USD / day"
              help="Total allowed spend across all actions in a 24h window."
              value={policy.maxUsdPerDay}
              min={0}
              step={1}
              suffix="USD/day"
              onChange={(v) => setPolicy((p) => ({ ...p, maxUsdPerDay: v }))}
            />
            <NumberRow
              label="Max USD / trade"
              help="Maximum notional allowed per trade execution. Proposals can exceed but will be rejected for execution."
              value={policy.maxUsdPerTrade}
              min={0}
              step={1}
              suffix="USD/trade"
              onChange={(v) => setPolicy((p) => ({ ...p, maxUsdPerTrade: v }))}
            />
            <NumberRow
              label="Max slippage"
              help="Maximum slippage allowed when executing swaps. Lower is safer."
              value={policy.slippageBps}
              min={0}
              max={10_000}
              step={5}
              suffix="bps"
              onChange={(v) => setPolicy((p) => ({ ...p, slippageBps: v }))}
            />
          </div>
        </Card>

        <Card title="Allowlists" subtitle="Restrict the surface area of what the system may touch.">
          <div className="grid gap-2">
            <TextRow
              label="Tokens"
              help="Comma-separated token addresses/symbols. Example: USDC, WETH, 0x..."
              value={tokensCsv}
              placeholder="USDC, WETH, 0x..."
              onChange={setTokensCsv}
            />
            <TextRow
              label="Venues"
              help="Comma-separated venue identifiers. Example: uniswap-v4, aerodrome, bankr"
              value={venuesCsv}
              placeholder="uniswap-v4, aerodrome, bankr"
              onChange={setVenuesCsv}
            />
            <TextRow
              label="Actions"
              help="Comma-separated action ids. Example: trade.quote, trade.execute, retire.propose"
              value={actionsCsv}
              placeholder="trade.quote, trade.execute, retire.propose"
              onChange={setActionsCsv}
            />
          </div>
        </Card>

        <Card
          title="Safety notes"
          subtitle="How this page affects system behavior."
        >
          <div className="grid gap-2 text-xs text-white/70">
            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
              <div className="font-semibold text-white/85">What changes</div>
              <div className="mt-1">
                This writes a policy object to <code className="text-white/85">/api/policy</code>. Other routes should
                consult it to decide what is allowed.
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
              <div className="font-semibold text-white/85">What does not happen</div>
              <div className="mt-1">
                No trades, transfers, or retirements happen from this screen.
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
              <div className="font-semibold text-white/85">Operator workflow</div>
              <div className="mt-1">
                Start with <b>PROPOSE_ONLY</b>, use strict allowlists + caps, then only move to execution modes with
                kill-switches ready.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
