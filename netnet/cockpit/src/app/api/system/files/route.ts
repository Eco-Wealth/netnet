import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function safeList(dirPath: string) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const directories: string[] = [];
    const files: string[] = [];
    for (const e of entries) {
      if (e.name === 'node_modules') continue;
      if (e.name.startsWith('.env')) continue;
      if (e.isDirectory()) directories.push(e.name);
      else files.push(e.name);
    }
    return { directories, files };
  } catch (e) {
    return { directories: [], files: [] };
  }
}

export async function GET() {
  const base = process.cwd();
  const vealthPath = path.join(base, 'netnet/cockpit/src/vealth');
  const appPath = path.join(base, 'netnet/cockpit/src/app');
  const vealth = safeList(vealthPath);
  const app = safeList(appPath);
  return NextResponse.json({ vealth, app });
}
