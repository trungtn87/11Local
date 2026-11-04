import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const rows = await db()`SELECT
      (SELECT count(*) FROM api.public_places) AS places,
      (SELECT coalesce(sum(views),0) FROM public.analytics_daily WHERE target='site') AS visits,
      (SELECT started_at FROM public.analytics_metadata WHERE singleton) AS started_at`;
    return NextResponse.json({ places: Number(rows[0].places), visits: Number(rows[0].visits), startedAt: rows[0].started_at }, { headers: { 'Cache-Control': 'public, max-age=30' } });
  } catch (error) {
    console.error('Public stats failed', error);
    return NextResponse.json({ error: 'STATS_UNAVAILABLE' }, { status: 503 });
  }
}
