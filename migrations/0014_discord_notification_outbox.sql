-- 11Local Discord notifications: additive schema, no mutation of existing records.
-- Apply to the dedicated 11Local Neon database; not to AutoTrade / 11Ship.
BEGIN;

CREATE TABLE IF NOT EXISTS public.discord_notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key varchar(180) NOT NULL UNIQUE,
  event_type text NOT NULL CHECK
    (event_type IN ('contribution','ownership','moderation','system','digest','test')),
  title varchar(200) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 1500),
  action_path text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','sent','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 100),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  lock_token uuid,
  last_error text,
  last_http_status integer,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discord_action_path_safe CHECK
    (action_path IS NULL OR action_path ~ '^/admin(/[A-Za-z0-9_-]+)*/?$')
);

CREATE INDEX IF NOT EXISTS discord_outbox_pending
  ON public.discord_notification_outbox (available_at,created_at,id)
  WHERE status='pending';
CREATE INDEX IF NOT EXISTS discord_outbox_processing
  ON public.discord_notification_outbox (locked_at,id)
  WHERE status='processing';
CREATE INDEX IF NOT EXISTS discord_outbox_recent
  ON public.discord_notification_outbox (created_at DESC,id DESC);

REVOKE ALL ON public.discord_notification_outbox FROM PUBLIC;
COMMIT;
