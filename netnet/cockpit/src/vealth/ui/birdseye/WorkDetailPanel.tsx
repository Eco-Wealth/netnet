import React, { useEffect, useState } from "react";
import type { WorkItem } from "./WorkDashboard";

type EventItem = {
  type?: string;
  message?: string;
  note?: string;
  actor?: string;
  by?: string;
  at?: string;
  createdAt?: string;
  [k: string]: any;
};

type Props = {
  selectedJobId: string | null;
};

export default function WorkDetailPanel({ selectedJobId }: Props) {
  const [job, setJob] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedJobId) {
      setJob(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch(`/api/work/${selectedJobId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setJob(data || null);
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
  }, [selectedJobId]);

  if (!selectedJobId) return <div>Select a job to see details</div>;

  if (loading) return <div>Loading details...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!job) return <div>No details available</div>;

  const events: EventItem[] = Array.isArray(job.events) ? job.events : [];

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
      <h4 style={{ margin: "4px 0" }}>{job.title || "(no title)"}</h4>
      <div style={{ fontSize: 13, color: "#475569" }}>{job.description}</div>
      <div style={{ marginTop: 8 }}>
        <strong>Status:</strong> {job.status || "-"}
      </div>
      <div style={{ marginTop: 8 }}>
        <strong>Tags:</strong> {Array.isArray(job.tags) ? job.tags.join(", ") : "-"}
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Events</strong>
        <div style={{ marginTop: 8 }}>
          {events.length === 0 ? (
            <div>No events</div>
          ) : (
            events.map((ev, i) => (
              <div key={i} style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.type || "event"}</div>
                <div style={{ fontSize: 13 }}>{ev.message || ev.note || ""}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  by: {ev.by || ev.actor || "-"} • at: {ev.at || ev.createdAt || "-"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
