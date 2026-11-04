/**
 * Only three finite image sizes are supported. Arbitrary dimensions would
 * let public traffic force unlimited CPU work on a small shared VPS.
 */
export const PHOTO_VARIANTS = Object.freeze({
  thumb: { width: 260, height: 260 },
  card: { width: 760, height: 570 },
  detail: { width: 1200, height: 900 },
} as const);

export type PhotoVariant = keyof typeof PHOTO_VARIANTS;

/** null: original; undefined: unsupported size parameter. */
export function photoPreset(value: string | null) {
  if (value === null) return null;
  return Object.hasOwn(PHOTO_VARIANTS, value)
    ? PHOTO_VARIANTS[value as PhotoVariant]
    : undefined;
}
