import React, { useEffect, useState } from "react";
import WorkItemDetail from "./WorkItemDetail";

type WorkItem = {
  id: string;
  title: string;
  description: string;
  owner: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function WorkList() {
  const [items, setItems] = useState<WorkItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/work');
      const json = await res.json();
      setItems(json.items || []);
    } catch (err: any) {
      setError(err.message || String(err));
    }
  }

  useEffect(() => { load(); }, []);

  if (error) return <div style={{ color: '#ff4d4f' }}>Error loading work items: {error}</div>;
  if (!items) return <div>Loading work items...</div>;

  return (
    <div style={{ borderTop: '1px solid #eee', marginTop: 16, paddingTop: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Work Queue</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>ID</th>
            <th style={{ textAlign: 'left' }}>Title</th>
            <th style={{ textAlign: 'left' }}>Owner</th>
            <th style={{ textAlign: 'left' }}>Status</th>
            <th style={{ textAlign: 'left' }}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} style={{ borderTop: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => setSelected(it.id)}>
              <td style={{ padding: '8px' }}>{it.id}</td>
              <td style={{ padding: '8px' }}>{it.title}</td>
              <td style={{ padding: '8px' }}>{it.owner}</td>
              <td style={{ padding: '8px' }}>{it.status}</td>
              <td style={{ padding: '8px' }}>{it.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && <WorkItemDetail id={selected} />}
    </div>
  );
}
