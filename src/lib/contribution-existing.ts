
export const feedbackKinds = ["report", "edit_place", "photo"] as const;
export type FeedbackKind = typeof feedbackKinds[number];
export const changeFields = {
  name: "Tên địa điểm",
  address: "Địa chỉ",
  area: "Khu vực",
  description: "Mô tả",
  summary: "Giới thiệu ngắn",
  phone: "Số điện thoại",
  opening_hours: "Giờ mở cửa",
  website_url: "Website",
  price_note: "Giá tham khảo",
} as const;
export type ChangeField = keyof typeof changeFields;
export type ExistingFeedback = {
  placeId: string; kind: FeedbackKind; note: string; reason: string;
  fieldKey: ChangeField | null; proposedValue: string | null;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
export function parseExistingFeedback(raw: unknown): ExistingFeedback {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("INVALID_INPUT");
  const v = raw as Record<string, unknown>;
  if (typeof v.placeId !== "string" || !UUID.test(v.placeId)) throw new Error("INVALID_PLACE");
  if (!feedbackKinds.includes(v.kind as FeedbackKind)) throw new Error("INVALID_KIND");
  const kind = v.kind as FeedbackKind;
  const note = typeof v.note === "string" ? v.note.trim() : "";
  if (note.length < (kind === "photo" ? 0 : 10) || note.length > 1200) throw new Error("INVALID_NOTE");
  const reason = typeof v.reason === "string" ? v.reason.trim() : "";
  if (kind === "report" && !["closed","wrong_location","duplicate","incorrect","other"].includes(reason))
    throw new Error("INVALID_REASON");
  let fieldKey: ChangeField | null = null;
  let proposedValue: string | null = null;
  if (kind === "edit_place") {
    if (typeof v.fieldKey !== "string" || !hasOwn(changeFields, v.fieldKey))
      throw new Error("INVALID_FIELD");
    fieldKey = v.fieldKey as ChangeField;
    if (typeof v.proposedValue !== "string") throw new Error("INVALID_VALUE");
    proposedValue = v.proposedValue.trim();
    const max = fieldKey === "description" ? 3000 :
      fieldKey === "address" || fieldKey === "website_url" ? 500 :
      fieldKey === "summary" ? 350 : fieldKey === "price_note" || fieldKey === "opening_hours" ? 300 :
      fieldKey === "phone" ? 40 : 160;
    if (proposedValue.length > max || (fieldKey === "name" && !proposedValue))
      throw new Error("INVALID_VALUE");
    if (fieldKey === "phone" && proposedValue && !/^[+\d().\s-]{6,40}$/.test(proposedValue))
      throw new Error("INVALID_PHONE");
    if (fieldKey === "website_url" && proposedValue) {
      try {
        const u = new URL(proposedValue);
        if (!["https:", "http:"].includes(u.protocol)) throw new Error();
      } catch { throw new Error("INVALID_WEBSITE_URL"); }
    }
  }
  return {placeId: v.placeId, kind, note, reason, fieldKey, proposedValue};
}
export function parseContributorReply(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("INVALID_INPUT");
  const v = raw as Record<string, unknown>;
  const text = typeof v.message === "string" ? v.message.trim() : "";
  if (text.length < 3 || text.length > 1200) throw new Error("INVALID_MESSAGE");
  if (!Number.isSafeInteger(v.expectedVersion) || (v.expectedVersion as number) < 1)
    throw new Error("INVALID_VERSION");
  return {message: text, expectedVersion: v.expectedVersion as number};
}
