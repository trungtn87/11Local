/** Static, parameterized SQL only. Values are always bound by postgres.js.
 * The endpoint authorizes and locks the place/grant/account before these reads.
 * No viewer, contributor, claimant or reviewer identity is selected.
 */
const ownUpdates = `
  SELECT 'information'::text AS kind,r.id,r.status,r.decision_note,r.created_at
    FROM public.place_revisions r WHERE r.place_id=$1::uuid AND r.submitted_by=$2::uuid AND r.source='owner'
  UNION ALL
  SELECT 'photo'::text AS kind,ph.id,ph.moderation_status AS status,NULL::text AS decision_note,ph.created_at
    FROM public.place_photos ph WHERE ph.place_id=$1::uuid AND ph.uploaded_by_user_id=$2::uuid AND ph.source='owner'
  UNION ALL
  SELECT 'menu'::text AS kind,mr.id,mr.status,mr.decision_note,mr.created_at
    FROM public.menu_revisions mr WHERE mr.place_id=$1::uuid AND mr.submitted_by=$2::uuid AND mr.source='owner'
`;
export const ownerDashboardSQL = {
  authorizedPlace: `SELECT p.id,p.name,p.slug,p.moderation_status,p.visibility,m.role
    FROM public.places p JOIN public.place_managers m ON m.place_id=p.id
    JOIN public.users u ON u.id=m.user_id AND u.google_sub IS NOT NULL
    WHERE p.id=$1::uuid AND m.user_id=$2::uuid AND m.status='active'
      AND m.role IN ('owner','manager') AND p.place_kind='business'
    FOR SHARE OF p,m,u`,
  traffic: `SELECT d.day::date::text AS day,coalesce(a.views,0)::float8 AS views
    FROM generate_series($2::date,$3::date,interval '1 day') d(day)
    LEFT JOIN public.analytics_daily a ON a.target=$1::text AND a.day=d.day::date
    ORDER BY d.day`,
  totals: `SELECT
    coalesce(sum(views) FILTER (WHERE day BETWEEN $2::date AND $3::date),0)::float8 AS current,
    coalesce(sum(views) FILTER (WHERE day >= $2::date-($3::date-$2::date+1) AND day < $2::date),0)::float8 AS previous,
    (SELECT coalesce(view_count,0)::float8 FROM public.place_metrics WHERE place_id=$1::uuid) AS lifetime
    FROM public.analytics_daily WHERE target=$1::text`,
  ratings: `SELECT stars,count(*)::int AS count FROM public.reviews
    WHERE place_id=$1::uuid AND moderation_status='approved' AND deleted_at IS NULL
    GROUP BY stars ORDER BY stars DESC`,
  reviews: `SELECT id,stars,content,created_at FROM public.reviews
    WHERE place_id=$1::uuid AND moderation_status='approved' AND deleted_at IS NULL
    ORDER BY created_at DESC,id DESC LIMIT 10`,
  updates: `SELECT kind,id,status,decision_note,created_at FROM (${ownUpdates}) own_updates
    ORDER BY created_at DESC,id DESC LIMIT 30`,
  updateCounts: `SELECT kind,status,count(*)::int AS count FROM (${ownUpdates}) own_updates GROUP BY kind,status ORDER BY kind,status`,
  menu: `SELECT content IS NOT NULL AS has_content,hidden,published_at FROM public.place_menus WHERE place_id=$1::uuid`,
  metadata: `SELECT started_at FROM public.analytics_metadata WHERE singleton`,
} as const;
