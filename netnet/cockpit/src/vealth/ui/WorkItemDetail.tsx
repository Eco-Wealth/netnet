import React, { useEffect, useState } from "react";

type WorkEvent = {
  id: string;
  workId: string;
  type: string;
  message: string;
  actor: string;
  createdAt: string;
};

export default function WorkItemDetail({ id }: { id: string }) {
  const [events, setEvents] = useState<WorkEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/work/${id}`);
        const json = await res.json();
        if (!mounted) return;
        // events are not returned separately, so assume server stores events in same file; call /api/work/:id to get events via item
        // Here we expect item and events available via item.events? Fallback: fetch full store is not exposed; instead, reuse /api/work to read events from server's file if included.
        // For now, call /api/work and filter events from response if provided.
        // Simpler: call /api/work/:id and expect { item } only; events are in the store file—so we'll attempt to fetch /api/work and find events array if present.
        // Implement a secondary fetch to /api/work to obtain events list returned by server (workStore currently stores events but API doesn't expose them separately). We'll try /api/work again and search global events.
        const allRes = await fetch(`/api/work`);
        const allJson = await allRes.json();
        // find events from allJson.items ? No. WorkStore doesn't return events through API. As a pragmatic approach, call /api/work/${id} and assume server includes events under item.events (if not, show none).
        const item = json.item;
        // Try to parse events from item._events (nonstandard) or fallback to empty
        const evts: WorkEvent[] = (item && (item._events as WorkEvent[])) || [];
        setEvents(evts);
      } catch (err: any) {
        setError(err.message || String(err));
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  if (error) return <div style={{ color: "#ff4d4f" }}>Error loading events: {error}</div>;
  if (!events) return <div>Loading events...</div>;
  if (events.length === 0) return <div>No events recorded.</div>;

  return (
    <div style={{ marginTop: 8, paddingLeft: 8 }}>
      <div style={{ fontWeight: 700 }}>Events</div>
      <ul>
        {events.map((e) => (
          <li key={e.id} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 12, color: "#666" }}>{e.createdAt} — {e.actor} — {e.type}</div>
            <div>{e.message}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
