/** Print a rollback-only regression using the exact SQL used by the API.
 * node --experimental-strip-types scripts/test-owner-dashboard-sql.ts
 * Execute the output on an isolated Neon branch with migrations through 0015.
 */
import { ownerDashboardSQL as q } from '../src/lib/owner-dashboard-sql.ts';
const literal=(s:string)=>"'"+s.replaceAll("'","''")+"'";
const aggregate=(s:string)=>literal(`SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM (${s}) t`);
console.log(`DO $$
DECLARE pid uuid=gen_random_uuid(); other_pid uuid=gen_random_uuid();
  uid uuid=gen_random_uuid(); other_uid uuid=gen_random_uuid(); deleted_uid uuid=gen_random_uuid();
  result jsonb; value record;
BEGIN
  BEGIN
    INSERT INTO public.users(id,google_sub,display_name) VALUES
      (uid,'dashboard-test-'||uid,'TEST_OWNER'),
      (other_uid,'dashboard-test-'||other_uid,'TEST_OTHER_OWNER'),
      (deleted_uid,'dashboard-test-'||deleted_uid,'TEST_DELETED_REVIEW');
    INSERT INTO public.places(id,slug,name,address,area,latitude,longitude,category_id,place_kind,moderation_status,visibility)
      VALUES (pid,'dashboard-test-'||pid,'TEST_PLACE','Test address','Test',22.6,106.2,'food','business','approved','visible'),
      (other_pid,'dashboard-test-'||other_pid,'OTHER_PLACE','Test address','Test',22.6,106.2,'food','business','approved','visible');
    INSERT INTO public.place_managers(place_id,user_id,role,status) VALUES
      (pid,uid,'manager','active'),(other_pid,other_uid,'manager','active');
    INSERT INTO public.analytics_daily(day,target,views) VALUES
      ('2026-11-04',pid::text,11),('2026-11-03',pid::text,4),('2026-11-04',other_pid::text,999);
    INSERT INTO public.place_metrics(place_id,view_count) VALUES (pid,99),(other_pid,999);
    INSERT INTO public.reviews(place_id,user_id,stars,content,moderation_status,deleted_at) VALUES
      (pid,uid,5,'PUBLIC_REVIEW','approved',NULL),
      (pid,other_uid,1,'PRIVATE_PENDING_REVIEW','pending',NULL),
      (pid,deleted_uid,1,'PRIVATE_DELETED_REVIEW','approved',now()),
      (other_pid,uid,1,'OTHER_PLACE_REVIEW','approved',NULL);
    INSERT INTO public.place_revisions(place_id,submitted_by,source,base_version,changes,status,decision_note) VALUES
      (pid,uid,'owner',1,'{}','pending','SELF_NOTE'),
      (pid,other_uid,'owner',1,'{}','pending','PRIVATE_OTHER_NOTE'),
      (pid,uid,'community',1,'{}','pending','PRIVATE_COMMUNITY_NOTE'),
      (other_pid,uid,'owner',1,'{}','pending','PRIVATE_OTHER_PLACE_NOTE');
    INSERT INTO public.place_photos(place_id,object_key,source,photo_type,moderation_status,uploaded_by_user_id) VALUES
      (pid,'dashboard-test-'||gen_random_uuid(),'owner','gallery','pending',uid),
      (pid,'dashboard-test-'||gen_random_uuid(),'owner','gallery','pending',other_uid),
      (pid,'dashboard-test-'||gen_random_uuid(),'community','gallery','pending',uid);
    INSERT INTO public.place_menus(place_id,content,published_at) VALUES
      (pid,'{"title":"Test menu","groups":[],"photoIds":[]}',now()-interval '91 days');
    INSERT INTO public.menu_revisions(place_id,submitted_by,source,base_version,content,status,decision_note) VALUES
      (pid,uid,'owner',1,'{}','draft','SELF_MENU_NOTE'),
      (pid,other_uid,'owner',1,'{}','approved','PRIVATE_OTHER_MENU_NOTE');

    EXECUTE ${aggregate(q.authorizedPlace)} INTO result USING pid,uid;
    IF jsonb_array_length(result)<>1 THEN RAISE EXCEPTION 'Active manager was denied'; END IF;
    UPDATE public.place_managers SET role='owner' WHERE place_id=pid AND user_id=uid;
    EXECUTE ${aggregate(q.authorizedPlace)} INTO result USING pid,uid;
    IF jsonb_array_length(result)<>1 THEN RAISE EXCEPTION 'Active owner was denied'; END IF;
    EXECUTE ${aggregate(q.authorizedPlace)} INTO result USING pid,other_uid;
    IF jsonb_array_length(result)<>0 THEN RAISE EXCEPTION 'Cross-place access allowed'; END IF;
    EXECUTE ${literal(q.totals)} INTO value USING pid,'2026-11-04','2026-11-04';
    IF value.current<>11 OR value.previous<>4 OR value.lifetime<>99 THEN RAISE EXCEPTION 'Cross-place metrics or wrong comparison'; END IF;
    EXECUTE ${aggregate(q.traffic)} INTO result USING pid,'2026-11-03','2026-11-04';
    IF jsonb_array_length(result)<>2 OR result->0->>'views'<>'4' OR result->1->>'views'<>'11' THEN RAISE EXCEPTION 'Incorrect daily series'; END IF;
    EXECUTE ${aggregate(q.ratings)} INTO result USING pid;
    IF jsonb_array_length(result)<>1 OR result->0->>'stars'<>'5' OR result->0->>'count'<>'1' THEN RAISE EXCEPTION 'Unpublished ratings leaked'; END IF;
    EXECUTE ${aggregate(q.reviews)} INTO result USING pid;
    IF jsonb_array_length(result)<>1 OR result::text LIKE '%PRIVATE%' OR result::text LIKE '%OTHER_PLACE%' OR result::text LIKE '%user_id%' THEN RAISE EXCEPTION 'Private review data leaked'; END IF;
    EXECUTE ${aggregate(q.updates)} INTO result USING pid,uid;
    IF jsonb_array_length(result)<>3 OR result::text LIKE '%PRIVATE%' OR result::text LIKE '%submitted_by%' THEN RAISE EXCEPTION 'Other actor/community updates leaked'; END IF;
    EXECUTE ${aggregate(q.updateCounts)} INTO result USING pid,uid;
    IF jsonb_array_length(result)<>3 OR EXISTS(SELECT 1 FROM jsonb_array_elements(result) e WHERE (e->>'count')::int<>1) THEN RAISE EXCEPTION 'Incorrect update totals'; END IF;
    EXECUTE ${literal(q.menu)} INTO value USING pid;
    IF NOT value.has_content OR value.hidden OR value.published_at > now()-interval '90 days' THEN RAISE EXCEPTION 'Incorrect menu status or draft reset reminder'; END IF;

    UPDATE public.place_managers SET status='suspended' WHERE place_id=pid AND user_id=uid;
    EXECUTE ${aggregate(q.authorizedPlace)} INTO result USING pid,uid;
    IF jsonb_array_length(result)<>0 THEN RAISE EXCEPTION 'Suspended manager retained access'; END IF;
    UPDATE public.place_managers SET status='revoked' WHERE place_id=pid AND user_id=uid;
    EXECUTE ${aggregate(q.authorizedPlace)} INTO result USING pid,uid;
    IF jsonb_array_length(result)<>0 THEN RAISE EXCEPTION 'Revoked manager retained access'; END IF;
    UPDATE public.place_managers SET status='active' WHERE place_id=pid AND user_id=uid;
    UPDATE public.users SET google_sub=NULL WHERE id=uid;
    EXECUTE ${aggregate(q.authorizedPlace)} INTO result USING pid,uid;
    IF jsonb_array_length(result)<>0 THEN RAISE EXCEPTION 'Unlinked account retained access'; END IF;
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='Rollback regression fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
END $$;`);
