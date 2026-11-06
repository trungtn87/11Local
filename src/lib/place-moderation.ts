export function parseExpectedVersion(input: unknown): number {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("INVALID_VERSION");
  }
  const value = (input as Record<string, unknown>).expectedVersion;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new Error("INVALID_VERSION");
  }
  return value;
}

export function parsePlaceRejection(input: unknown): { expectedVersion: number; reason: string } {
  const expectedVersion = parseExpectedVersion(input);
  const reasonValue = (input as Record<string, unknown>).reason;
  const reason = typeof reasonValue === "string" ? reasonValue.trim() : "";
  if (reason.length < 5) throw new Error("REASON_REQUIRED");
  if (reason.length > 500) throw new Error("REASON_TOO_LONG");
  return { expectedVersion, reason };
}
