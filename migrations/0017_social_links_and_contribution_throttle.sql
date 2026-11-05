-- 11Local: optional social links and short anti-spam protection.
-- Additive and idempotent. Existing place IDs and contribution records are untouched.
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text;

-- Retain the original per-actor counter table, but switch its window from 24h to 1 minute in application code.
-- The unique key prevents duplicate submissions across instances, not just in process memory.
CREATE TABLE IF NOT EXISTS public.contribution_recent_submissions (
  fingerprint text NOT NULL,
  payload_hash text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fingerprint, payload_hash)
);
CREATE INDEX IF NOT EXISTS contribution_recent_submissions_time_idx
  ON public.contribution_recent_submissions (submitted_at);
REVOKE ALL ON public.contribution_recent_submissions
  FROM PUBLIC, anonymous, local_public_reader;
