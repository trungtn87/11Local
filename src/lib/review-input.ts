export type ReviewInput = { stars: number; content: string };
export type ReviewEditInput = ReviewInput & { expectedVersion: number };
export type ReviewDecisionInput = {
  action: "approve" | "reject" | "hide";
  revisionId: string | null;
  expectedVersion: number;
  note: string;
};

export function isReviewUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function parseReviewInput(value: unknown): ReviewInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_INPUT");
  const input = value as Record<string, unknown>;
  if (!Number.isInteger(input.stars) || (input.stars as number) < 1 || (input.stars as number) > 5)
    throw new Error("INVALID_STARS");
  if (input.content !== undefined && typeof input.content !== "string") throw new Error("INVALID_CONTENT");
  const content = (input.content as string | undefined ?? "").trim();
  if (content.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(content))
    throw new Error("INVALID_CONTENT");
  return { stars: input.stars as number, content };
}

export function parseExpectedVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error("INVALID_VERSION");
  return value as number;
}

export function parseReviewEdit(value: unknown): ReviewEditInput {
  const parsed = parseReviewInput(value);
  return { ...parsed, expectedVersion: parseExpectedVersion((value as Record<string, unknown>).expectedVersion) };
}

export function parseReviewDecision(value: unknown): ReviewDecisionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_INPUT");
  const input = value as Record<string, unknown>;
  if (input.action !== "approve" && input.action !== "reject" && input.action !== "hide")
    throw new Error("INVALID_ACTION");
  const expectedVersion = parseExpectedVersion(input.expectedVersion);
  const revisionId = input.revisionId == null ? null : input.revisionId;
  if (revisionId !== null && !isReviewUuid(revisionId)) throw new Error("INVALID_REVISION");
  if (input.action === "hide" && revisionId !== null) throw new Error("INVALID_ACTION");
  if (input.note !== undefined && typeof input.note !== "string") throw new Error("INVALID_NOTE");
  const note = ((input.note as string | undefined) ?? "").trim();
  if (note.length > 500 || (input.action !== "approve" && note.length < 5))
    throw new Error("REASON_REQUIRED");
  return { action: input.action, revisionId, expectedVersion, note };
}

export function parseReviewPagination(params: URLSearchParams) {
  const limit = Number(params.get("limit") ?? "10");
  const page = Number(params.get("page") ?? "1");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20 ||
      !Number.isSafeInteger(page) || page < 1 || page > 100)
    throw new Error("INVALID_PAGINATION");
  return { limit, offset: (page - 1) * limit, page };
}
