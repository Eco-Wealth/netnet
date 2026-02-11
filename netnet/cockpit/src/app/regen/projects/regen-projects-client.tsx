"use client";

import { useMemo, useState } from "react";

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok?: false; error: string };

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

export default function RegenProjectsClient() {
  const [packet, setPacket] = useState<any>({
    projectName: "",
    location: "",
    methodology: "",
    mrv: { notes: "" },
    registry: "regen",
  });
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => String(packet?.projectName || "").trim().length > 2, [packet]);

  async function generate() {
    setErr(null);
    setOut(null);
    try {
      const data = await postJSON<ApiOk<any> | ApiErr>("/api/agent/regen/projects", { action: "generate", packet });
      if ((data as any).ok) setOut(data);
      else setErr((data as any).error || "generate_failed");
    } catch (e: any) {
      setErr(e?.message || "generate_failed");
    }
  }

  async function validate() {
    setErr(null);
    try {
      const data = await postJSON<ApiOk<any> | ApiErr>("/api/agent/regen/projects", { action: "validate", packet });
      setOut(data);
      if (!(data as any).ok) setErr((data as any).error || "invalid");
    } catch (e: any) {
      setErr(e?.message || "validate_failed");
    }
  }

  async function attachToWork() {
    setErr(null);
    try {
      const title = `Regen project packet: ${packet.projectName || "untitled"}`;
      const body = {
        title,
        description: "Proposal-only packet generated in Regen workspace.",
        tags: ["regen", "project", "proposal"],
        priority: "MEDIUM",
      };
      const res = await postJSON<any>("/api/work", body);
      setOut({ ...(out || {}), work: res });
    } catch (e: any) {
      setErr(e?.message || "work_failed");
    }
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="opacity-70">Project name</span>
          <input
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            value={packet.projectName || ""}
            onChange={(e) => setPacket({ ...packet, projectName: e.target.value })}
            placeholder="Mangrove restoration — Gulf Coast"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="opacity-70">Location</span>
          <input
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            value={packet.location || ""}
            onChange={(e) => setPacket({ ...packet, location: e.target.value })}
            placeholder="Country/region, coordinates if available"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span className="opacity-70">Methodology</span>
        <input
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
          value={packet.methodology || ""}
          onChange={(e) => setPacket({ ...packet, methodology: e.target.value })}
          placeholder="Short methodology tag / approach"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="opacity-70">MRV notes</span>
        <textarea
          className="min-h-[90px] rounded-xl border border-white/10 bg-black/20 px-3 py-2"
          value={packet?.mrv?.notes || ""}
          onChange={(e) => setPacket({ ...packet, mrv: { ...(packet.mrv || {}), notes: e.target.value } })}
          placeholder="Assumptions, data sources, cadence, risks..."
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
          onClick={generate}
          disabled={!canSubmit}
        >
          Generate packet
        </button>
        <button className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15" onClick={validate}>
          Validate
        </button>
        <button className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15" onClick={attachToWork}>
          Create work item
        </button>
      </div>

      {err ? <div className="text-sm text-red-300">{err}</div> : null}
      {out ? (
        <pre className="max-h-[420px] overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
          {JSON.stringify(out, null, 2)}
        </pre>
      ) : (
        <div className="text-xs opacity-60">Outputs show packet + validation + next steps. Execution is always gated.</div>
      )}
    </div>
  );
}
