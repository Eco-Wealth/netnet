"use client";

import { useEffect, useMemo, useState } from "react";
import type { Policy, AutonomyLevel } from "@/lib/policy/store";
import { Card, Button, Input, Pill, SectionTitle, Switch } from "@/components/ui";

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "loaded"; policy: Policy }
  | { status: "error"; message: string };

const AUTONOMY: { value: AutonomyLevel; label: string; hint: string }[] = [
  { value: "READ_ONLY", label: "Read-only", hint: "No proposing, no execution." },
  { value: "PROPOSE_ONLY", label: "Propose-only", hint: "Agent drafts plans; operator approves." },
  { value: "EXECUTE_WITH_LIMITS", label: "Execute w/ limits", hint: "Operator sets caps + kill switches." },
];

export default function GovernancePolicyEditor() {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [draft, setDraft] = useState<Policy | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/policy", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message || "failed to load policy");
      setState({ status: "loaded", policy: json.policy as Policy });
      setDraft(json.policy as Policy);
    } catch (e: any) {
      setState({ status: "error", message: e?.message || "failed to load policy" });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const dirty = useMemo(() => {
    if (state.status !== "loaded" || !draft) return false;
    return JSON.stringify(state.policy) !== JSON.stringify(draft);
  }, [state, draft]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/policy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ policy: draft }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message || "failed to save policy");
      setState({ status: "loaded", policy: json.policy as Policy });
      setDraft(json.policy as Policy);
    } catch (e: any) {
      setState({ status: "error", message: e?.message || "failed to save policy" });
    } finally {
      setSaving(false);
    }
  }

  function setList(key: "allowlistTokens" | "allowlistVenues" | "allowlistChains", v: string) {
    if (!draft) return;
    const list = v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setDraft({ ...draft, [key]: list });
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <Card>
        <SectionTitle title="Policy" subtitle="Loading policy…" />
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card>
        <SectionTitle title="Policy" subtitle="Error loading policy" />
        <p className="text-sm opacity-80">{state.message}</p>
        <div className="mt-3">
          <Button onClick={load}>Retry</Button>
        </div>
      </Card>
    );
  }

  if (!draft) return null;

  return (
    <Card>
      <SectionTitle
        title="Governance policy"
        subtitle="Caps, allowlists, autonomy level, and kill switches. Safe-by-default."
      />

      <div className="mt-4 grid gap-4">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Autonomy</div>
            <Pill>{draft.autonomy}</Pill>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {AUTONOMY.map((a) => (
              <button
                key={a.value}
                onClick={() => setDraft({ ...draft, autonomy: a.value })}
                className={[
                  "rounded-xl border p-3 text-left transition",
                  draft.autonomy === a.value ? "border-black" : "opacity-80 hover:opacity-100",
                ].join(" ")}
              >
                <div className="text-sm font-semibold">{a.label}</div>
                <div className="mt-1 text-xs opacity-80">{a.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-sm font-medium">Max USD / day</div>
            <Input
              value={String(draft.maxUsdPerDay)}
              onChange={(e) => setDraft({ ...draft, maxUsdPerDay: Number(e.target.value) })}
              placeholder="25"
            />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">Max USD / action</div>
            <Input
              value={String(draft.maxUsdPerAction)}
              onChange={(e) => setDraft({ ...draft, maxUsdPerAction: Number(e.target.value) })}
              placeholder="10"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Allowlist tokens (comma-separated)</div>
          <Input value={draft.allowlistTokens.join(", ")} onChange={(e) => setList("allowlistTokens", e.target.value)} />
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Allowlist venues (comma-separated)</div>
          <Input value={draft.allowlistVenues.join(", ")} onChange={(e) => setList("allowlistVenues", e.target.value)} />
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Allowlist chains (comma-separated)</div>
          <Input value={draft.allowlistChains.join(", ")} onChange={(e) => setList("allowlistChains", e.target.value)} />
        </div>

        <div className="grid gap-3 rounded-2xl border p-3">
          <div className="text-sm font-medium">Kill switches</div>
          <div className="grid gap-2 md:grid-cols-2">
            <Switch label="Kill all" checked={draft.kill.all} onChange={(v) => setDraft({ ...draft, kill: { ...draft.kill, all: v } })} />
            <Switch label="Kill trading" checked={draft.kill.trading} onChange={(v) => setDraft({ ...draft, kill: { ...draft.kill, trading: v } })} />
            <Switch label="Kill token ops" checked={draft.kill.tokenOps} onChange={(v) => setDraft({ ...draft, kill: { ...draft.kill, tokenOps: v } })} />
            <Switch label="Kill retirements" checked={draft.kill.retirements} onChange={(v) => setDraft({ ...draft, kill: { ...draft.kill, retirements: v } })} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs opacity-70">
            Updated: {new Date(draft.updatedAt).toLocaleString()} • By: {draft.updatedBy}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={load} disabled={saving}>
              Reload
            </Button>
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : dirty ? "Save policy" : "Saved"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
