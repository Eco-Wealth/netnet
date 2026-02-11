"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Code, Input, Muted } from "@/components/ui";

type Program = { id: string; name?: string; description?: string; steps?: any[] };

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  return r.json();
}

export default function RunProgramsClient() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [actor, setActor] = useState("operator");
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getJSON<any>("/api/programs")
      .then((j) => setPrograms(Array.isArray(j?.programs) ? j.programs : []))
      .catch(() => setPrograms([]));
  }, []);

  const selected = useMemo(() => programs.find((p) => p.id === programId) ?? null, [programs, programId]);

  async function run() {
    if (!programId) return;
    setBusy(true);
    try {
      const r = await fetch("/api/programs/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ programId, createWork: true, actor }),
      });
      setOut(await r.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Card title="Programs Runner" subtitle="Proposal-only: generate a step plan and a Work item.">
        <div className="grid gap-3">
          <div className="grid gap-2">
            <div className="text-sm font-medium">Program</div>
            <select
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
            >
              <option value="">Select…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? p.id}
                </option>
              ))}
            </select>
            {selected?.description ? <Muted>{selected.description}</Muted> : null}
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Actor</div>
            <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="operator" />
          </div>

          <div className="flex items-center gap-2">
            <Button disabled={!programId || busy} onClick={run}>
              {busy ? "Proposing…" : "Generate proposal"}
            </Button>
            <Muted>Creates a Work item for review.</Muted>
          </div>
        </div>
      </Card>

      <Card title="Output" subtitle="Proposed steps and workId">
        <Code>{out ? JSON.stringify(out, null, 2) : "No output yet."}</Code>
      </Card>
    </div>
  );
}
