import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { dateRange } from '@/lib/analytics-policy';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  let range;
  try { range = dateRange(params); }
  catch { return NextResponse.json({ error: 'INVALID_DATE_RANGE' }, { status: 400 }); }
  const { start, end } = range;
  const category = params.get('category') || '';
  try {
    const sql = db();
    const [places, contributions, reviews, daily, top, visits, categories, metadata, queue] = await Promise.all([
      sql`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE p.id IN (SELECT id FROM api.public_places))::int AS published,
        count(*) FILTER (WHERE p.visibility='hidden')::int AS hidden,
        count(*) FILTER (WHERE p.moderation_status='pending')::int AS pending,
        count(*) FILTER (WHERE p.ownership_status='verified')::int AS verified
        FROM public.places p WHERE (${category}='' OR p.category_id=${category})`,
      sql`SELECT c.kind,c.moderation_status AS status,count(*)::int AS count
        FROM public.contributions c LEFT JOIN public.places p ON p.id=c.place_id
        WHERE c.created_at >= (${start}::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND c.created_at < ((${end}::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
        AND (${category}='' OR coalesce(p.category_id,c.payload->>'categoryId')=${category})
        GROUP BY c.kind,c.moderation_status`,
      sql`SELECT r.moderation_status AS status,r.stars,count(*)::int AS count
        FROM public.reviews r JOIN public.places p ON p.id=r.place_id
        WHERE r.deleted_at IS NULL AND r.created_at >= (${start}::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AND r.created_at < ((${end}::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
        AND (${category}='' OR p.category_id=${category}) GROUP BY r.moderation_status,r.stars`,
      sql`SELECT d.day::date::text AS day,
        coalesce(sum(a.views) FILTER (WHERE a.target='site'),0)::float8 AS visits,
        coalesce(sum(a.views) FILTER (WHERE a.target<>'site' AND (${category}='' OR p.category_id=${category})),0)::float8 AS views
        FROM generate_series(${start}::date,${end}::date,interval '1 day') d(day)
        LEFT JOIN public.analytics_daily a ON a.day=d.day::date
        LEFT JOIN public.places p ON p.id::text=a.target
        GROUP BY d.day ORDER BY d.day`,
      sql`SELECT p.id,p.name,p.slug,sum(a.views)::float8 AS views FROM public.analytics_daily a
        JOIN public.places p ON p.id::text=a.target
        WHERE a.day BETWEEN ${start}::date AND ${end}::date
        AND (${category}='' OR p.category_id=${category})
        GROUP BY p.id ORDER BY views DESC,p.name LIMIT 10`,
      sql`SELECT
        coalesce(sum(views) FILTER (WHERE day BETWEEN ${start}::date AND ${end}::date),0)::float8 AS current,
        coalesce(sum(views) FILTER (WHERE day >= ${start}::date-(${end}::date-${start}::date+1) AND day < ${start}::date),0)::float8 AS previous
        FROM public.analytics_daily WHERE target='site'`,
      sql`SELECT id,name FROM public.categories ORDER BY sort_order,name`,
      sql`SELECT started_at FROM public.analytics_metadata WHERE singleton`,
      sql`SELECT
        (SELECT count(*) FROM public.contributions WHERE moderation_status='pending')::int AS contributions,
        (SELECT count(*) FROM public.contributions WHERE moderation_status='needs_info')::int AS needs_info,
        ((SELECT count(*) FROM public.reviews WHERE moderation_status='pending' AND deleted_at IS NULL) +
         (SELECT count(*) FROM public.review_revisions rv JOIN public.reviews r ON r.id=rv.review_id
          WHERE rv.status='pending' AND r.deleted_at IS NULL))::int AS reviews`,
    ]);
    return NextResponse.json({ range, places: places[0], contributions, reviews, daily, top, visits: visits[0], categories, queue: queue[0], startedAt: metadata[0]?.started_at }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Dashboard query failed', error);
    return NextResponse.json({ error: 'DASHBOARD_UNAVAILABLE' }, { status: 503 });
  }
}
