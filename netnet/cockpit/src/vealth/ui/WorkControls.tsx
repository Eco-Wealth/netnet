import React, { useState } from "react";

export default function WorkControls({ onDone }: { onDone?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runOnce() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/worker/run-once', { method: 'POST' });
      const json = await res.json();
      if (json.result) setMessage(`Processed ${json.result.processed || 'none'}`);
      else setMessage('No work processed');
      if (onDone) onDone();
    } catch (err: any) {
      setMessage(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid #eee", marginTop: 16, paddingTop: 16 }}>
      <button onClick={runOnce} disabled={loading} style={{ padding: '8px 12px' }}>
        {loading ? 'Running...' : 'Run Worker Once'}
      </button>
      {message && <div style={{ marginTop: 8 }}>{message}</div>}
    </div>
  );
}
