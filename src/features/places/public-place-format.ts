export type PublicFact = { label: string; field_type: string; value: unknown };
export type OpeningSlot = {
  day_of_week: number; slot_index: number; opens_at: string | null; closes_at: string | null;
  is_closed: boolean; is_24_hours: boolean;
};
export type PlacePrice = { label: string; amount_min: string | number | null;
  amount_max: string | number | null; currency: string; unit: string | null; note: string | null };
const weekdays = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
export function formatFact(fact: PublicFact): { label: string; text: string; url?: string } | null {
  const {label, field_type: type, value} = fact;
  if (value === null || value === undefined || value === "") return null;
  if (type === "boolean") return typeof value === "boolean" ? {label,text:value ? "Có" : "Không"} : null;
  if (type === "number") return typeof value === "number" && Number.isFinite(value)
    ? {label,text:new Intl.NumberFormat("vi-VN").format(value)} : null;
  if (type === "multi_select") return Array.isArray(value) && value.length &&
    value.every(v => typeof v === "string") ? {label,text:value.join(" · ")} : null;
  if (type === "url") { const url = safeUrl(value); return url ? {label,text:"Mở liên kết",url} : null; }
  return typeof value === "string" && value.trim()
    ? {label,text:value.trim()} : null;
}
export function formatHours(slots: OpeningSlot[]): string[] {
  const days = new Map<number,string[]>();
  for (const s of slots) {
    const day = Number(s.day_of_week);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    const label = s.is_closed ? "Đóng cửa" : s.is_24_hours ? "Mở cửa 24 giờ" :
      s.opens_at && s.closes_at ? s.opens_at.slice(0,5) + "–" + s.closes_at.slice(0,5) : null;
    if (!label) continue;
    days.set(day, [...(days.get(day) || []), label]);
  }
  return [...days.entries()].sort((a,b)=>a[0]-b[0])
    .map(([day,values]) => weekdays[day] + ": " + values.join(", "));
}
function currency(amount: number, code: string) {
  if (!Number.isFinite(amount)) return "";
  if (code === "VND") return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
  try { return new Intl.NumberFormat("vi-VN",{style:"currency",currency:code}).format(amount); }
  catch { return new Intl.NumberFormat("vi-VN").format(amount) + " " + code; }
}
export function formatPrice(price: PlacePrice): string {
  const low = price.amount_min == null ? null : Number(price.amount_min);
  const high = price.amount_max == null ? null : Number(price.amount_max);
  const validLow = low !== null && Number.isFinite(low) && low >= 0;
  const validHigh = high !== null && Number.isFinite(high) && high >= 0;
  const range = validLow && low !== null ? currency(low, price.currency || "VND") +
    (validHigh && high !== null && high !== low ? " – " + currency(high, price.currency || "VND") : "") : "";
  return [range && (price.unit ? range + " / " + price.unit : range), price.note].filter(Boolean).join(" · ");
}
export function ownershipMessage(kind: string | undefined, ownership: string): string | null {
  if (kind !== "business") return null;
  if (ownership === "verified") return "Đã xác minh quản lý";
  if (ownership === "disputed") return "Quyền quản lý đang được xác minh";
  return "Chưa xác minh chủ địa điểm";
}
