import React, { useState } from "react";

export default function GitHubControlPanel(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const resp = await fetch("/github/test-pr", { method: "POST" });
      const json = await resp.json();
      if (json.success) setResult(json);
      else setError(json.error || "Unknown error");
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid #eee", marginTop: 16, paddingTop: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>GitHub Control</div>
      <button onClick={handleClick} disabled={loading} style={{ padding: "8px 12px" }}>
        {loading ? "Creating..." : "Create Test PR"}
      </button>

      {result && (
        <div style={{ marginTop: 8 }}>
          <div>Branch: {result.branch}</div>
          <div>Commit: {result.commit}</div>
          <div>
            PR: <a href={result.prUrl} target="_blank" rel="noreferrer">{result.prUrl}</a>
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 8, color: "#ff4d4f" }}>Error: {error}</div>}
    </div>
  );
}
