import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'development') {
      const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
      return NextResponse.json({
        version: `1.0.${commitCount}`,
        timestamp: parseInt(commitCount),
      });
    }
  } catch {
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'version.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ version: '1.0.0', timestamp: Date.now() });
  }
}
