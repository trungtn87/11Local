import { NextResponse } from 'next/server';
import { recordView, visitCookie } from '@/lib/analytics-server';
export async function POST(request: Request) {
  try {
    const result = await recordView(request);
    const response = NextResponse.json({ ok: true }, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
    if (result.token) response.cookies.set(visitCookie.name, result.token, visitCookie);
    return response;
  } catch (error) {
    console.error('Visit metrics failed', error);
    return NextResponse.json({ error: 'METRICS_UNAVAILABLE' }, { status: 503 });
  }
}
