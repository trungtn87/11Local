-- Family contributors are already approved at account level.
-- Their new photos become public immediately; manual photo moderation is retired.
ALTER TABLE public.family_photos ALTER COLUMN status SET DEFAULT 'approved';
UPDATE public.family_photos SET status='approved'
  WHERE status='pending';
