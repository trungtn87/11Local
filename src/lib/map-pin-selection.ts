/**
 * A pin location is committed only by an intentional single tap, never while
 * zooming or immediately following a two-finger gesture.
 */
export function canCommitPinTap(
  zooming: boolean,
  clickCount: number,
  now: number,
  blockedUntil: number,
): boolean {
  return !zooming && clickCount <= 1 && now >= blockedUntil;
}
