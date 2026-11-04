/**
 * Public, non-secret configuration model. The webhook itself never belongs
 * in this object or in responses from Admin APIs.
 */
export const DISCORD_GROUPS = [
  { key: "contribution", label: "Đóng góp & ảnh", description: "Địa điểm mới, báo sai, sửa thông tin và ảnh cộng đồng." },
  { key: "review", label: "Đánh giá", description: "Đánh giá mới và các đề xuất chỉnh sửa đánh giá." },
  { key: "ownership", label: "Xác minh & phân quyền", description: "Yêu cầu nhận quyền, tranh chấp, cấp hoặc thu hồi quyền." },
  { key: "moderation", label: "Kết quả kiểm duyệt", description: "Phê duyệt, từ chối và yêu cầu bổ sung nội dung." },
  { key: "system", label: "Cảnh báo hệ thống", description: "Sử dụng từ bước 4 khi tích hợp giám sát lỗi." },
] as const;

export type DiscordGroup = (typeof DISCORD_GROUPS)[number]["key"];
export type DiscordGroupSettings = Record<DiscordGroup, boolean>;
export const DEFAULT_DISCORD_GROUP_SETTINGS: DiscordGroupSettings = {
  contribution: true,
  review: true,
  ownership: true,
  moderation: true,
  system: true,
};

export type DiscordSettings = {
  enabled: boolean;
  groups: DiscordGroupSettings;
  version: number;
  updatedAt: string;
};

export function parseDiscordSettingsUpdate(value: unknown): Pick<DiscordSettings, "enabled" | "groups" | "version"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_SETTINGS");
  const item = value as Record<string, unknown>;
  if (typeof item.enabled !== "boolean") throw new Error("INVALID_SETTINGS");
  if (!Number.isSafeInteger(item.version) || (item.version as number) < 1) throw new Error("INVALID_VERSION");
  const groups = item.groups;
  if (!groups || typeof groups !== "object" || Array.isArray(groups)) throw new Error("INVALID_GROUPS");
  const raw = groups as Record<string, unknown>;
  const keys = DISCORD_GROUPS.map(group => group.key);
  if (Object.keys(raw).length !== keys.length ||
      Object.keys(raw).some(key => !keys.includes(key as DiscordGroup)) ||
      keys.some(key => typeof raw[key] !== "boolean")) throw new Error("INVALID_GROUPS");
  return {
    enabled: item.enabled,
    version: item.version as number,
    groups: Object.fromEntries(keys.map(key => [key, raw[key]])) as DiscordGroupSettings,
  };
}

/**
 * Older outbox items have event_group=NULL. Their legacy event_type remains
 * readable; moderation reviews are therefore in the moderation group.
 */
export function fallbackDiscordGroup(type: string, group: string | null): DiscordGroup | "test" | "legacy" {
  if (group && DISCORD_GROUPS.some(item => item.key === group)) return group as DiscordGroup;
  if (type === "ownership") return "ownership";
  if (type === "moderation") return "moderation";
  if (type === "system") return "system";
  // Older digest records are archival only; daily reports are discontinued.
  if (type === "digest") return "legacy";
  if (type === "test") return "test";
  return "contribution";
}
