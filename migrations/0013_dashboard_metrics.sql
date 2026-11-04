-- Additive analytics; existing lifetime place counters remain intact.
BEGIN;
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  session_hash text NOT NULL,
  target text NOT NULL,
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_hash, target)
);
CREATE INDEX IF NOT EXISTS analytics_sessions_expiry ON public.analytics_sessions(last_seen);
CREATE TABLE IF NOT EXISTS public.analytics_daily (
  day date NOT NULL,
  target text NOT NULL,
  views bigint NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (day, target)
);
CREATE INDEX IF NOT EXISTS analytics_daily_target ON public.analytics_daily(target, day);
CREATE TABLE IF NOT EXISTS public.analytics_metadata (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  started_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.analytics_metadata(singleton) VALUES (true) ON CONFLICT DO NOTHING;
REVOKE ALL ON public.analytics_sessions, public.analytics_daily, public.analytics_metadata
  FROM PUBLIC, anonymous, local_public_reader;
COMMIT;
