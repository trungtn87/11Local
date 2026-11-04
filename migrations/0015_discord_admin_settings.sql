-- 11Local Discord step 3: server-side Admin preferences, never webhook secrets.
-- Apply only to 11Local Neon, after 0014 (and keep existing outbox rows).
BEGIN;

CREATE TABLE IF NOT EXISTS public.discord_notification_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  master_enabled boolean NOT NULL DEFAULT false,
  groups jsonb NOT NULL DEFAULT '{
    "contribution": true,
    "review": true,
    "ownership": true,
    "moderation": true,
    "system": true
  }'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discord_settings_groups_valid CHECK (
    jsonb_typeof(groups) = 'object'
    AND jsonb_typeof(groups->'contribution') = 'boolean'
    AND jsonb_typeof(groups->'review') = 'boolean'
    AND jsonb_typeof(groups->'ownership') = 'boolean'
    AND jsonb_typeof(groups->'moderation') = 'boolean'
    AND jsonb_typeof(groups->'system') = 'boolean'
  )
);
INSERT INTO public.discord_notification_settings (id)
VALUES (1) ON CONFLICT (id) DO NOTHING;
-- Safe when an earlier draft of 0015 was applied: discard the canceled
-- digest preference without resetting other Admin choices.
ALTER TABLE public.discord_notification_settings
  DROP CONSTRAINT IF EXISTS discord_settings_groups_valid;
ALTER TABLE public.discord_notification_settings
  ADD CONSTRAINT discord_settings_groups_valid CHECK (
    jsonb_typeof(groups) = 'object'
    AND jsonb_typeof(groups->'contribution') = 'boolean'
    AND jsonb_typeof(groups->'review') = 'boolean'
    AND jsonb_typeof(groups->'ownership') = 'boolean'
    AND jsonb_typeof(groups->'moderation') = 'boolean'
    AND jsonb_typeof(groups->'system') = 'boolean'
  );
UPDATE public.discord_notification_settings
SET groups = groups - 'digest', updated_at = now(), version = version + 1
WHERE groups ? 'digest';


-- Older outbox rows have NULL group and fall back to event_type.
-- Legacy digest rows remain schema-compatible but can never be dispatched.
ALTER TABLE public.discord_notification_outbox
  ADD COLUMN IF NOT EXISTS event_group text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.discord_notification_outbox'::regclass
      AND conname = 'discord_outbox_event_group_valid'
  ) THEN
    ALTER TABLE public.discord_notification_outbox
      ADD CONSTRAINT discord_outbox_event_group_valid
      CHECK (event_group IS NULL OR event_group IN
        ('contribution','review','ownership','moderation','system','digest'));
  END IF;
END $$;

REVOKE ALL ON public.discord_notification_settings FROM PUBLIC;
COMMIT;
