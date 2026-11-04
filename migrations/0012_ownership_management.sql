-- 11Local OWN-01: ownership claims / manual approval backend.
-- Additive and re-runnable. Apply ONLY to the dedicated 11Local Neon DB,
-- after migrations 0001-0011. Existing place/user/photo IDs are unchanged.
BEGIN;

ALTER TABLE public.ownership_claims
  ADD COLUMN IF NOT EXISTS claimant_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS relationship text NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS decision_note text,
  ADD COLUMN IF NOT EXISTS review_method text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- The original check allows pending/approved/rejected/disputed. Add needs_info.
ALTER TABLE public.ownership_claims DROP CONSTRAINT IF EXISTS ownership_claims_status_check;
ALTER TABLE public.ownership_claims
  ADD CONSTRAINT ownership_claims_status_check
  CHECK (status IN ('pending','needs_info','approved','rejected','disputed'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.ownership_claims'::regclass AND conname='ownership_claims_version_check') THEN
    ALTER TABLE public.ownership_claims ADD CONSTRAINT ownership_claims_version_check CHECK (version >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.ownership_claims'::regclass AND conname='ownership_claims_relationship_check') THEN
    ALTER TABLE public.ownership_claims ADD CONSTRAINT ownership_claims_relationship_check
      CHECK (relationship IN ('owner','authorized'));
  END IF;
END $$;

-- Prevent simultaneous open claims from the same user for the same place.
CREATE UNIQUE INDEX IF NOT EXISTS ownership_claims_one_open_per_user_place
  ON public.ownership_claims (place_id,user_id)
  WHERE status IN ('pending','needs_info','disputed');
CREATE INDEX IF NOT EXISTS ownership_claims_review_queue
  ON public.ownership_claims (status,created_at DESC,id);
CREATE INDEX IF NOT EXISTS ownership_claims_user_history
  ON public.ownership_claims (user_id,created_at DESC,id);

CREATE TABLE IF NOT EXISTS public.ownership_claim_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.ownership_claims(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('admin','claimant')),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 5 AND 1500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ownership_claim_messages_by_claim
  ON public.ownership_claim_messages(claim_id,created_at,id);

-- Private evidence is never inserted into public.place_photos and never exposed
-- through the public data API. Store compressed WebP only.
CREATE TABLE IF NOT EXISTS public.ownership_claim_evidence_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.ownership_claims(id) ON DELETE CASCADE,
  mime_type text NOT NULL DEFAULT 'image/webp' CHECK (mime_type='image/webp'),
  contents bytea NOT NULL CHECK (octet_length(contents) BETWEEN 1 AND 2097152),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ownership_claim_evidence_by_claim
  ON public.ownership_claim_evidence_images(claim_id,created_at,id);

CREATE TABLE IF NOT EXISTS public.ownership_claim_limits (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);

ALTER TABLE public.place_managers
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.place_managers'::regclass AND conname='place_managers_version_check') THEN
    ALTER TABLE public.place_managers ADD CONSTRAINT place_managers_version_check CHECK (version >= 1);
  END IF;
END $$;

REVOKE ALL ON public.ownership_claims, public.ownership_claim_messages,
  public.ownership_claim_evidence_images, public.ownership_claim_limits,
  public.place_managers FROM PUBLIC, anonymous, local_public_reader;
COMMIT;
