import { isUuid, optionalDate } from "./family-contribution.ts";

export const MAP_CATEGORIES = [
  { value: "food", label: "Quán ăn, cà phê", emoji: "🍜" },
  { value: "travel", label: "Du lịch", emoji: "🏞️" },
  { value: "play", label: "Vui chơi", emoji: "🎡" },
  { value: "stay", label: "Lưu trú", emoji: "🏡" },
  { value: "landmark", label: "Địa danh", emoji: "📍" },
  { value: "other", label: "Khác", emoji: "🍯" },
] as const;

export type MapCategory = (typeof MAP_CATEGORIES)[number]["value"];
export type PlaceKind = "memory" | "curated";
export type MapPlaceInput = {
  title: string; description: string; address: string;
  latitude: number; longitude: number; visited_on: string | null;
  category: MapCategory; kind: PlaceKind; visibility: boolean; album_ids: string[];
};

export function parseMapPlace(value: unknown): { data: MapPlaceInput } | { error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "Dữ liệu địa điểm không hợp lệ" };
  const v = value as Record<string, unknown>;
  const title = typeof v.title === "string" ? v.title.trim() : "";
  const description = typeof v.description === "string" ? v.description.trim() : "";
  const address = typeof v.address === "string" ? v.address.trim() : "";
  const latitude = v.latitude;
  const longitude = v.longitude;
  const date = optionalDate(v.visited_on);
  const category = v.category ?? "other";
  const kind = v.kind ?? "curated";
  const visibility = v.visibility ?? true;
  const albumIds = v.album_ids ?? [];
  if (!title || title.length > 150 || description.length > 2000 || address.length > 300)
    return { error: "Tên, mô tả hoặc địa chỉ quá dài hoặc không hợp lệ" };
  if (typeof latitude !== "number" || typeof longitude !== "number" ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
    return { error: "Hãy chọn tọa độ hợp lệ trên bản đồ" };
  if (date === undefined) return { error: "Ngày ghé thăm không hợp lệ" };
  if (!MAP_CATEGORIES.some(item => item.value === category)) return { error: "Danh mục không hợp lệ" };
  if (kind !== "memory" && kind !== "curated") return { error: "Loại địa điểm không hợp lệ" };
  if (typeof visibility !== "boolean") return { error: "Trạng thái hiển thị không hợp lệ" };
  if (!Array.isArray(albumIds) || albumIds.length > 30 || !albumIds.every(isUuid))
    return { error: "Danh sách album liên quan không hợp lệ" };
  const ids = [...new Set(albumIds as string[])];
  return { data: {
    title, description, address,
    latitude, longitude, visited_on: date,
    category: category as MapCategory,
    kind: kind as PlaceKind,
    visibility, album_ids: ids,
  } };
}
