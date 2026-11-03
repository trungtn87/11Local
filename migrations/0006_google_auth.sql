-- 11Local public user authentication via Google OAuth only.
-- Compatible with the original phone-based users table: keep old columns/data,
-- but phone is no longer required for newly authenticated Google users.
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text,
  phone_verified_at timestamptz,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_sub text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_uidx ON public.users (google_sub);
CREATE INDEX IF NOT EXISTS users_email_lower_idx ON public.users (lower(email)) WHERE email IS NOT NULL;

REVOKE ALL ON public.users FROM PUBLIC, anonymous, local_public_reader;
