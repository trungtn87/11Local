-- Existing Google users also require explicit approval; no implicit grandfathering.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS family_access_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS family_access_reviewed_at timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS family_access_note text;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_family_access_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_family_access_status_check
  CHECK (family_access_status IN ('pending','approved','rejected','blocked'));
UPDATE public.users SET family_access_status='pending'
  WHERE family_access_status IS NULL OR family_access_status NOT IN ('pending','approved','rejected','blocked');
CREATE INDEX IF NOT EXISTS users_family_access_status_idx ON public.users (family_access_status,created_at DESC)
  WHERE google_sub IS NOT NULL;
