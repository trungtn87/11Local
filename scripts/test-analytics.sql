DO $$
DECLARE accepted integer; total bigint;
BEGIN
  BEGIN
    WITH counted AS (
      INSERT INTO public.analytics_sessions(session_hash,target) VALUES ('dashboard-regression','site')
      ON CONFLICT (session_hash,target) DO UPDATE SET last_seen=now()
      WHERE analytics_sessions.last_seen <= now()-interval '30 minutes' RETURNING target
    ) SELECT count(*) INTO accepted FROM counted;
    IF accepted <> 1 THEN RAISE EXCEPTION 'First visit must count'; END IF;
    WITH counted AS (
      INSERT INTO public.analytics_sessions(session_hash,target) VALUES ('dashboard-regression','site')
      ON CONFLICT (session_hash,target) DO UPDATE SET last_seen=now()
      WHERE analytics_sessions.last_seen <= now()-interval '30 minutes' RETURNING target
    ) SELECT count(*) INTO accepted FROM counted;
    IF accepted <> 0 THEN RAISE EXCEPTION 'Duplicate must not count'; END IF;
    UPDATE public.analytics_sessions SET last_seen=now()-interval '31 minutes'
      WHERE session_hash='dashboard-regression' AND target='site';
    WITH counted AS (
      INSERT INTO public.analytics_sessions(session_hash,target) VALUES ('dashboard-regression','site')
      ON CONFLICT (session_hash,target) DO UPDATE SET last_seen=now()
      WHERE analytics_sessions.last_seen <= now()-interval '30 minutes' RETURNING target
    ) SELECT count(*) INTO accepted FROM counted;
    IF accepted <> 1 THEN RAISE EXCEPTION 'Expired visit must count'; END IF;
    INSERT INTO public.analytics_daily(day,target,views) VALUES (current_date,'dashboard-regression',1)
      ON CONFLICT(day,target) DO UPDATE SET views=analytics_daily.views+1;
    INSERT INTO public.analytics_daily(day,target,views) VALUES (current_date,'dashboard-regression',1)
      ON CONFLICT(day,target) DO UPDATE SET views=analytics_daily.views+1;
    SELECT views INTO total FROM public.analytics_daily WHERE day=current_date AND target='dashboard-regression';
    IF total <> 2 THEN RAISE EXCEPTION 'Daily aggregate failed'; END IF;
    RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='rollback test fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
END $$
