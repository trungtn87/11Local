import { NextResponse } from 'next/server';
import { recordView, visitCookie } from '@/lib/analytics-server';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'INVALID_PLACE_ID' }, { status: 400 });
  try {
    const result = await recordView(request, id);
    const response = NextResponse.json({ ok: true }, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
    if (result.token) response.cookies.set(visitCookie.name, result.token, visitCookie);
    return response;
  } catch (error) {
    const missing = error instanceof Error && error.message === 'PLACE_NOT_FOUND';
    if (!missing) console.error('Place metrics failed', error);
    return NextResponse.json({ error: missing ? 'PLACE_NOT_FOUND' : 'METRICS_UNAVAILABLE' }, { status: missing ? 404 : 503 });
  }
}
