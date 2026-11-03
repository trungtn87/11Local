/** Parse a manually entered latitude/longitude without treating an empty field as zero. */
export function parseCoordinateInput(raw: string, min: number, max: number): number | null {
  const value = raw.trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}
