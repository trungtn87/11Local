import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';
import { isBot, sameOrigin, SESSION_SECONDS } from '@/lib/analytics-policy';

const COOKIE = '11local_visit';
function sign(value: string) {
  const secret = process.env.USER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('Analytics session secret is not configured');
  return createHmac('sha256', secret).update(value).digest('base64url');
}
function session(token?: string) {
  if (token) {
    const [id, signature] = token.split('.');
    if (/^[a-f0-9-]{36}$/.test(id || '') && signature) {
      const expected = Buffer.from(sign(id));
      const supplied = Buffer.from(signature);
      if (expected.length === supplied.length && timingSafeEqual(expected, supplied)) return token;
    }
  }
  const id = randomUUID();
  return id + '.' + sign(id);
}

export async function recordView(request: Request, placeId?: string) {
  if (!sameOrigin(request)) return { status: 403, error: 'INVALID_ORIGIN' };
  if (isBot(request.headers.get('user-agent') || '') || await isAdmin()) return { status: 200 };
  const token = session((await cookies()).get(COOKIE)?.value);
  const hash = createHash('sha256').update(token).digest('hex');
  const target = placeId || 'site';
  const sql = db();
  await sql.begin(async tx => {
    if (placeId) {
      const visible = await tx`SELECT id FROM api.public_places WHERE id=${placeId}::uuid`;
      if (!visible.length) throw new Error('PLACE_NOT_FOUND');
    }
    // Site sessions slide with activity. Place views use a fixed 30-minute window.
    // The conditional upsert serializes simultaneous requests for the same session.
    const rows = await tx`
      INSERT INTO public.analytics_sessions(session_hash,target) VALUES (${hash},${target})
      ON CONFLICT (session_hash,target) DO UPDATE SET last_seen=now()
      WHERE analytics_sessions.last_seen <= now() - interval '30 minutes'
      RETURNING target`;
    if (rows.length) {
      await tx`INSERT INTO public.analytics_daily(day,target,views)
        VALUES ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,${target},1)
        ON CONFLICT (day,target) DO UPDATE SET views=analytics_daily.views+1`;
      if (placeId) await tx`INSERT INTO public.place_metrics(place_id,view_count)
        VALUES (${placeId}::uuid,1) ON CONFLICT (place_id)
        DO UPDATE SET view_count=place_metrics.view_count+1,updated_at=now()`;
    }
    if (!placeId) await tx`UPDATE public.analytics_sessions SET last_seen=now()
      WHERE session_hash=${hash} AND target='site'`;
    // Bounded cleanup of short-lived deduplication data. No IP or user identity stored.
    await tx`DELETE FROM public.analytics_sessions WHERE (session_hash,target) IN
      (SELECT session_hash,target FROM public.analytics_sessions
       WHERE last_seen < now() - interval '2 days' ORDER BY last_seen LIMIT 100)`;
  });
  return { status: 200, token };
}
export const visitCookie = { name: COOKIE, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_SECONDS };
