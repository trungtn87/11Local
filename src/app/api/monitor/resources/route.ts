import { NextResponse } from 'next/server';
import { sampleMonitorResources } from '@/lib/monitor-resources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public, read-only resource counters for VPS Monitor; no user or business data.
export async function GET() {
  return NextResponse.json(sampleMonitorResources(), {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
