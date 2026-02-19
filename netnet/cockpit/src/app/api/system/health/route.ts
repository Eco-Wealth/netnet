import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date().toISOString();
  const uptimeSeconds = Math.floor(process.uptime());
  return NextResponse.json({ status: 'ok', timestamp: now, uptimeSeconds });
}
