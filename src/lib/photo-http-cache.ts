import { createHash } from "node:crypto";

/** Metadata-based validator: uploaded photo bytes are immutable; deletion/revocation is checked per request. */
export function photoEtag(id: string, createdAt: string) {
  const digest = createHash("sha256").update(id).update(":").update(createdAt).digest("hex").slice(0, 32);
  return `W/"gau-photo-${digest}"`;
}

export function matchesPhotoEtag(ifNoneMatch: string | null, etag: string) {
  return Boolean(ifNoneMatch && ifNoneMatch.split(",").some(tag => tag.trim() === etag));
}
