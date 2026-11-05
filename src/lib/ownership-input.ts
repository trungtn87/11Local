/** Pure validation and state rules for OWN-01; shared by server routes and tests. */
export type ClaimStatus = "pending" | "needs_info" | "approved" | "rejected" | "disputed";
export type ClaimDecision = {
  action: "approve" | "reject" | "needs_info" | "dispute";
  expectedVersion: number;
  note: string;
  reviewMethod: string;
};
export type ManagerDecision = {
  action: "grant_manager" | "suspend" | "resume" | "revoke";
  userId: string;
  expectedVersion: number | null;
  note: string;
};

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_INPUT");
  return value as Record<string, unknown>;
}
function requiredText(value: unknown, min: number, max: number, code: string): string {
  if (typeof value !== "string") throw new Error(code);
  const text = value.trim();
  if (text.length < min || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text)) throw new Error(code);
  return text;
}
export function parseVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error("INVALID_VERSION");
  return value as number;
}
export function parseClaimInput(value: unknown) {
  const x = obj(value);
  if (!isUuid(x.placeId)) throw new Error("INVALID_PLACE");
  const claimantName = requiredText(x.claimantName, 2, 100, "INVALID_NAME");
  const phone = requiredText(x.contactPhone, 9, 16, "INVALID_PHONE").replace(/[ .-]/g, "");
  if (!/^(?:0[0-9]{9}|\+84[0-9]{9})$/.test(phone)) throw new Error("INVALID_PHONE");
  if (x.relationship !== "owner" && x.relationship !== "authorized") throw new Error("INVALID_RELATIONSHIP");
  const statement = requiredText(x.statement, 20, 2000, "INVALID_STATEMENT");
  return {placeId: x.placeId, claimantName, contactPhone: phone, relationship: x.relationship, statement};
}
export function parseClaimReply(value: unknown) {
  const x = obj(value);
  return {expectedVersion: parseVersion(x.expectedVersion),
    message: requiredText(x.message, 5, 1500, "INVALID_MESSAGE")};
}
export function parseClaimDecision(value: unknown): ClaimDecision {
  const x = obj(value);
  if (!["approve","reject","needs_info","dispute"].includes(String(x.action)))
    throw new Error("INVALID_ACTION");
  const action = x.action as ClaimDecision["action"];
  const note = x.note === undefined ? "" : requiredText(x.note, 0, 1000, "INVALID_NOTE");
  if (action !== "approve" && note.length < 5) throw new Error("REASON_REQUIRED");
  const reviewMethod = x.reviewMethod === undefined ? "" :
    requiredText(x.reviewMethod, 0, 100, "INVALID_REVIEW_METHOD");
  if (action === "approve" && reviewMethod.length < 5) throw new Error("REVIEW_METHOD_REQUIRED");
  return {action,expectedVersion:parseVersion(x.expectedVersion),note,reviewMethod};
}
export function parseManagerDecision(value: unknown): ManagerDecision {
  const x = obj(value);
  if (!["grant_manager","suspend","resume","revoke"].includes(String(x.action)))
    throw new Error("INVALID_ACTION");
  if (!isUuid(x.userId)) throw new Error("INVALID_USER");
  const note = requiredText(x.note, 5, 1000, "REASON_REQUIRED");
  const action = x.action as ManagerDecision["action"];
  return {action,userId:x.userId,
    expectedVersion:action === "grant_manager" ? null : parseVersion(x.expectedVersion),note};
}
export function canReview(status: ClaimStatus): boolean {
  return status === "pending" || status === "needs_info" || status === "disputed";
}
export function canClaim(status: ClaimStatus): boolean {
  return status === "pending" || status === "needs_info" || status === "disputed";
}
export function isActiveManager(role: unknown, status: unknown): boolean {
  return (role === "owner" || role === "manager") && status === "active";
}
