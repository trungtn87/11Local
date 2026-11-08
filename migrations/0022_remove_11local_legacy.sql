-- Run ONLY after Nhà của Gấu replacement code is live and functional.
-- Owner explicitly authorized deletion of legacy 11Local data and schema without backup.
-- Preserve public.users and the new family_* tables.
BEGIN;
DROP VIEW IF EXISTS api.public_places, api.public_categories;
DROP TABLE IF EXISTS public.analytics_daily,
  public.analytics_metadata,
  public.analytics_sessions,
  public.categories,
  public.category_fields,
  public.category_icon_blobs,
  public.contribution_messages,
  public.contribution_photos,
  public.contribution_rate_limits,
  public.contribution_recent_submissions,
  public.contributions,
  public.menu_revisions,
  public.moderation_logs,
  public.ownership_claim_evidence_images,
  public.ownership_claim_limits,
  public.ownership_claim_messages,
  public.ownership_claims,
  public.place_details,
  public.place_image_blobs,
  public.place_likes,
  public.place_managers,
  public.place_menus,
  public.place_metrics,
  public.place_opening_hours,
  public.place_photos,
  public.place_prices,
  public.place_revisions,
  public.place_tags,
  public.place_video_reviews,
  public.places,
  public.review_revisions,
  public.review_submission_limits,
  public.reviews,
  public.tags CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS phone, DROP COLUMN IF EXISTS phone_verified_at;
DROP SCHEMA IF EXISTS api;
COMMIT;
