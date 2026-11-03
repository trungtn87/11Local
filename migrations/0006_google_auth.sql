-- 11Local public user authentication via Google OAuth only.
-- Admin authentication remains separate and is not changed by this migration.
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_lower_idx ON public.users (lower(email));

REVOKE ALL ON public.users FROM PUBLIC, anonymous, local_public_reader;
