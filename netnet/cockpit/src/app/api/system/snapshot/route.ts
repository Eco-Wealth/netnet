import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { listWorkItems } from "../../../../vealth/work/workStore";

export async function GET() {
  try {
    const items = listWorkItems();
    const byStatus: Record<string, number> = { NEW: 0, IN_PROGRESS: 0, BLOCKED: 0, DONE: 0 };
    items.forEach((it: any) => {
      const s = (it.status || '').toUpperCase();
      if (s.includes('IN_PROGRESS')) byStatus.IN_PROGRESS += 1;
      else if (s.includes('BLOCKED')) byStatus.BLOCKED += 1;
      else if (s.includes('DONE')) byStatus.DONE += 1;
      else byStatus.NEW += 1;
    });

    const sorted = [...items].sort((a: any, b: any) => {
      const atA = a.updatedAt || '';
      const atB = b.updatedAt || '';
      return atB.localeCompare(atA);
    });

    const recentJobs = sorted.slice(0, 10).map((j: any) => ({ id: j.id, title: j.title, status: j.status, updatedAt: j.updatedAt }));

    const workerStatePath = path.join(process.cwd(), 'netnet/cockpit/src/vealth/worker/workerState.json');
    let workerState: { lastRun: string | null; lastProcessedId: string | null } = { lastRun: null, lastProcessedId: null };
    try {
      if (fs.existsSync(workerStatePath)) {
        const raw = fs.readFileSync(workerStatePath, 'utf-8');
        const parsed = JSON.parse(raw);
        workerState.lastRun = parsed.lastRun || null;
        workerState.lastProcessedId = parsed.lastProcessedId || null;
      }
    } catch (e) {
      // ignore
    }

    const runtime = {
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
    };

    const snapshot = {
      queueSummary: { total: items.length, byStatus },
      recentJobs,
      workerState,
      runtime,
    };

    return NextResponse.json(snapshot);
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
