import React, { useEffect, useState } from "react";

export type WorkItem = {
  id: string;
  title?: string;
  owner?: string;
  status?: string;
  updatedAt?: string; // ISO
  [k: string]: any;
};

type Props = {
  refreshKey: number;
  onSelect: (id: string | null) => void;
};

const groupStatuses = (items: WorkItem[]) => {
  const groups: Record<string, WorkItem[]> = {
    NEW: [],
    IN_PROGRESS: [],
    BLOCKED: [],
    DONE: [],
  };
  items.forEach((it) => {
    const s = (it.status || "").toUpperCase();
    if (s.includes("IN_PROGRESS") || s === "IN_PROGRESS") groups.IN_PROGRESS.push(it);
    else if (s.includes("BLOCKED") || s === "BLOCKED") groups.BLOCKED.push(it);
    else if (s === "DONE" || s.includes("DONE")) groups.DONE.push(it);
    else groups.NEW.push(it);
  });
  return groups;
};

export default function WorkDashboard({ refreshKey, onSelect }: Props) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch("/api/work")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data)) setItems(data);
        else if (data && Array.isArray(data.items)) setItems(data.items);
        else setItems([]);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(String(e));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const groups = groupStatuses(items);

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    padding: 12,
    borderRadius: 6,
    minWidth: 220,
    marginRight: 12,
  };

  const containerStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    overflowX: "auto",
  };

  const rowStyle: React.CSSProperties = {
    padding: 8,
    borderBottom: "1px solid #f1f5f9",
    cursor: "pointer",
  };

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Work Queue</h3>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div style={containerStyle}>
        {(["NEW", "IN_PROGRESS", "BLOCKED", "DONE"] as const).map((key) => (
          <div key={key} style={sectionStyle}>
            <strong>{key.replace("_", " ")}</strong>
            <div style={{ marginTop: 8 }}>
              {(groups[key] || []).map((job) => (
                <div
                  key={job.id}
                  style={rowStyle}
                  onClick={() => onSelect(job.id)}
                  title={job.title}
                >
                  <div style={{ fontWeight: 600 }}>{job.title || "(no title)"}</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    id: {job.id} • owner: {job.owner || "-"}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{job.updatedAt || ""}</div>
                </div>
              ))}
              {(groups[key] || []).length === 0 && (
                <div style={{ marginTop: 8, color: "#94a3b8" }}>No items</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
