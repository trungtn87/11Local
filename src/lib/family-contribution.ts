// Pure input validation shared by the contribution API and unit tests.
export type Existing = { mode: "existing"; id: string };
export type NewAlbum = { mode: "new"; title: string; description: string; event_date: string | null };
export type NewPlace = { mode: "new"; title: string; latitude: number; longitude: number; visited_on: string | null };
export type NewMilestone = { mode: "new"; title: string; details: string; event_date: string };
export type MemoryContribution = {
  request_id: string;
  album: Existing | NewAlbum;
  place: { mode: "none" } | Existing | NewPlace;
  milestone: { mode: "none" } | Existing | NewMilestone;
};
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function optionalDate(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year,month,day] = value.split("-").map(Number);
  const actual = new Date(Date.UTC(year, month - 1, day));
  return actual.getUTCFullYear() === year && actual.getUTCMonth() === month - 1 && actual.getUTCDate() === day ? value : undefined;
}
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function limitedText(value: unknown, max: number, required: boolean): string | null {
  if (typeof value !== "string") return required ? null : "";
  const text = value.trim();
  return ((!required || text.length > 0) && text.length <= max) ? text : null;
}
export function parseMemoryContribution(value: unknown): { data: MemoryContribution } | { error: string } {
  const body = object(value);
  if (!body || !isUuid(body.request_id)) return { error: "Mã lượt đóng góp không hợp lệ" };
  const a = object(body.album);
  if (!a || (a.mode !== "existing" && a.mode !== "new")) return { error: "Hãy chọn hoặc tạo album" };
  let album: MemoryContribution["album"];
  if (a.mode === "existing") {
    if (!isUuid(a.id)) return { error: "Album không hợp lệ" };
    album = { mode: "existing", id: a.id };
  } else {
    const title = limitedText(a.title, 150, true);
    const description = limitedText(a.description ?? "", 2000, false);
    const event_date = optionalDate(a.event_date);
    if (title === null || description === null || event_date === undefined) return { error: "Tên, mô tả hoặc ngày album không hợp lệ" };
    album = { mode: "new", title, description, event_date };
  }
  const p = object(body.place) ?? { mode: "none" };
  let place: MemoryContribution["place"];
  if (p.mode === "none") place = { mode: "none" };
  else if (p.mode === "existing") {
    if (!isUuid(p.id)) return { error: "Địa điểm không hợp lệ" };
    place = { mode: "existing", id: p.id };
  } else if (p.mode === "new") {
    const title = limitedText(p.title, 150, true);
    const latitude = p.latitude, longitude = p.longitude;
    const visited_on = optionalDate(p.visited_on);
    if (title === null || typeof latitude !== "number" || typeof longitude !== "number" ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || visited_on === undefined) {
      return { error: "Vui lòng nhập tên và chọn ghim hợp lệ trên bản đồ" };
    }
    place = { mode: "new", title, latitude, longitude, visited_on };
  } else return { error: "Lựa chọn địa điểm không hợp lệ" };
  const m = object(body.milestone) ?? { mode: "none" };
  let milestone: MemoryContribution["milestone"];
  if (m.mode === "none") milestone = { mode: "none" };
  else if (m.mode === "existing") {
    if (!isUuid(m.id)) return { error: "Cột mốc không hợp lệ" };
    milestone = { mode: "existing", id: m.id };
  } else if (m.mode === "new") {
    const title = limitedText(m.title, 150, true);
    const details = limitedText(m.details ?? "", 4000, false);
    const event_date = optionalDate(m.event_date);
    if (title === null || details === null || !event_date) return { error: "Cột mốc cần tên và ngày hợp lệ" };
    milestone = { mode: "new", title, details, event_date };
  } else return { error: "Lựa chọn cột mốc không hợp lệ" };
  return { data: { request_id: body.request_id, album, place, milestone } };
}
