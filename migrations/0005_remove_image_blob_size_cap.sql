-- 11Local: remove the temporary 300 KiB stored-image cap.
-- Keep the non-empty blob guard; upload input limits remain enforced by the application.
ALTER TABLE public.place_image_blobs
  DROP CONSTRAINT IF EXISTS place_image_blobs_contents_check;

ALTER TABLE public.place_image_blobs
  ADD CONSTRAINT place_image_blobs_contents_check
  CHECK (octet_length(contents) >= 1);
