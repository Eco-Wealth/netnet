import React, { useState } from "react";

type Props = {
  onRunComplete?: (result: any) => void;
};

export default function WorkControls({ onRunComplete }: Props) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runOnce = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const resp = await fetch("/api/worker/run-once", { method: "POST" });
      const data = await resp.json();
      setResult(data);
      if (onRunComplete) onRunComplete(data);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={runOnce} disabled={running} style={{ padding: "8px 12px" }}>
        {running ? "Running…" : "Run Worker Once"}
      </button>
      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          <div>Result:</div>
          <pre style={{ background: "#f8fafc", padding: 8 }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
