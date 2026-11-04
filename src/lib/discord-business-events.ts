import type { TransactionSql } from "postgres";
import { isDiscordEnabled, type DiscordEventType } from "./discord-notifications.ts";
import type { DiscordGroup } from "./discord-settings.ts";

/**
 * Controlled event catalog: never interpolate arbitrary user-submitted text, PII,
 * decision notes, photos or ownership evidence into Discord messages.
 */
const TEMPLATES = {
  "contribution.new_place": ["contribution", "📍 Địa điểm mới chờ duyệt", "Cộng đồng vừa đề xuất một địa điểm mới.", "/admin/dong-gop"],
  "contribution.report": ["contribution", "🚩 Báo sai thông tin địa điểm", "Một địa điểm hiện có vừa được cộng đồng báo sai.", "/admin/dong-gop"],
  "contribution.edit_place": ["contribution", "✏️ Đề xuất chỉnh sửa địa điểm", "Có thông tin địa điểm cần Admin kiểm duyệt.", "/admin/dong-gop"],
  "contribution.photo": ["contribution", "📷 Ảnh cộng đồng chờ duyệt", "Có ảnh mới được gửi cho địa điểm hiện có.", "/admin/dong-gop"],
  "contribution.reply": ["contribution", "💬 Đóng góp đã bổ sung thông tin", "Người gửi đã phản hồi yêu cầu bổ sung và hồ sơ trở lại trạng thái chờ duyệt.", "/admin/dong-gop"],
  "review.created": ["contribution", "⭐ Đánh giá mới chờ duyệt", "Một người dùng Google vừa gửi đánh giá địa điểm.", "/admin/danh-gia"],
  "review.edited": ["contribution", "⭐ Đánh giá chỉnh sửa chờ duyệt", "Người dùng đã chỉnh sửa đánh giá; cần kiểm duyệt lại.", "/admin/danh-gia"],
  "ownership.claimed": ["ownership", "🔑 Yêu cầu xác minh chủ địa điểm", "Có người gửi yêu cầu nhận quyền quản lý địa điểm.", "/admin/xac-minh"],
  "ownership.reply": ["ownership", "💬 Hồ sơ xác minh được bổ sung", "Người yêu cầu đã bổ sung thông tin cho Admin.", "/admin/xac-minh"],
  "owner.revision": ["contribution", "✏️ Chủ địa điểm đề xuất chỉnh sửa", "Nội dung chỉnh sửa của chủ địa điểm đang chờ duyệt.", "/admin/noi-dung-chu"],
  "owner.photo": ["contribution", "📷 Ảnh của chủ địa điểm chờ duyệt", "Ảnh do chủ địa điểm tải lên đang chờ Admin duyệt.", "/admin/noi-dung-chu"],
  "moderation.contribution.approved": ["moderation", "✅ Đóng góp đã duyệt", "Admin đã phê duyệt đóng góp.", "/admin/dong-gop"],
  "moderation.contribution.rejected": ["moderation", "❌ Đóng góp bị từ chối", "Admin đã từ chối đóng góp.", "/admin/dong-gop"],
  "moderation.contribution.needs_info": ["moderation", "📝 Đóng góp cần bổ sung", "Admin đã yêu cầu người gửi bổ sung hồ sơ.", "/admin/dong-gop"],
  "moderation.review.approved": ["moderation", "✅ Đánh giá đã duyệt", "Admin đã phê duyệt đánh giá hoặc bản chỉnh sửa.", "/admin/danh-gia"],
  "moderation.review.rejected": ["moderation", "❌ Đánh giá bị từ chối", "Admin đã từ chối đánh giá hoặc bản chỉnh sửa.", "/admin/danh-gia"],
  "moderation.review.hide": ["moderation", "🚫 Đánh giá đã ẩn", "Admin đã ẩn đánh giá hiện có.", "/admin/danh-gia"],
  "moderation.ownership.approved": ["ownership", "✅ Chủ địa điểm được xác minh", "Admin đã xác minh và cấp quyền chủ địa điểm.", "/admin/xac-minh"],
  "moderation.ownership.rejected": ["ownership", "❌ Xác minh chủ bị từ chối", "Admin đã từ chối yêu cầu xác minh.", "/admin/xac-minh"],
  "moderation.ownership.needs_info": ["ownership", "📝 Xác minh cần bổ sung", "Admin yêu cầu bổ sung bằng chứng xác minh.", "/admin/xac-minh"],
  "moderation.ownership.disputed": ["ownership", "⚠️ Xác minh có tranh chấp", "Yêu cầu xác minh đang ở trạng thái tranh chấp.", "/admin/xac-minh"],
  "moderation.owner_revision.approved": ["moderation", "✅ Chỉnh sửa của chủ đã duyệt", "Admin đã phê duyệt nội dung của chủ địa điểm.", "/admin/noi-dung-chu"],
  "moderation.owner_revision.rejected": ["moderation", "❌ Chỉnh sửa của chủ bị từ chối", "Admin đã từ chối nội dung của chủ địa điểm.", "/admin/noi-dung-chu"],
  "moderation.owner_photo.approved": ["moderation", "✅ Ảnh chủ địa điểm đã duyệt", "Admin đã phê duyệt ảnh của chủ địa điểm.", "/admin/noi-dung-chu"],
  "moderation.owner_photo.rejected": ["moderation", "❌ Ảnh chủ địa điểm bị từ chối", "Admin đã từ chối ảnh của chủ địa điểm.", "/admin/noi-dung-chu"],
  "moderation.manager.grant_manager": ["ownership", "🔑 Cấp quyền quản lý", "Admin đã cấp quyền quản lý địa điểm.", "/admin/xac-minh"],
  "moderation.manager.suspend": ["ownership", "⏸️ Tạm khóa quyền quản lý", "Admin đã tạm khóa quyền quản lý địa điểm.", "/admin/xac-minh"],
  "moderation.manager.resume": ["ownership", "✅ Khôi phục quyền quản lý", "Admin đã khôi phục quyền quản lý địa điểm.", "/admin/xac-minh"],
  "moderation.manager.revoke": ["ownership", "🚫 Thu hồi quyền quản lý", "Admin đã thu hồi quyền quản lý địa điểm.", "/admin/xac-minh"],
} as const satisfies Record<string, readonly [DiscordEventType, string, string, `/admin/${string}`]>;

export type DiscordBusinessAction = keyof typeof TEMPLATES;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildDiscordBusinessEvent(
  action: DiscordBusinessAction, entityId: string, revision: number | string = 1,
) {
  if (!Object.prototype.hasOwnProperty.call(TEMPLATES, action)) throw new Error("INVALID_BUSINESS_ACTION");
  if (!UUID.test(entityId)) throw new Error("INVALID_BUSINESS_ID");
  const keyPart = typeof revision === "number"
    ? (Number.isSafeInteger(revision) && revision >= 1 ? String(revision) : "")
    : (/^[a-zA-Z0-9:-]{1,100}$/.test(revision) ? revision : "");
  if (!keyPart) throw new Error("INVALID_BUSINESS_REVISION");
  const [type, title, description, actionPath] = TEMPLATES[action];
  const group: DiscordGroup = action.startsWith("review.") ? "review"
    : action.startsWith("ownership.") || action.startsWith("moderation.ownership.")
      || action.startsWith("moderation.manager.") ? "ownership"
    : action.startsWith("moderation.") ? "moderation"
    : "contribution";
  const eventKey = `${action}:${entityId.toLowerCase()}:${keyPart}`;
  if (eventKey.length > 180) throw new Error("INVALID_EVENT_KEY");
  return {
    eventKey,
    group,
    event: { type, title, description: `${description}\nMã hồ sơ: ${entityId}`, actionPath },
  };
}

/** Call ONLY from inside the successful business transaction. Never send HTTP in the transaction. */
export async function enqueueBusinessDiscordInTx(
  tx: TransactionSql, action: DiscordBusinessAction, entityId: string,
  revision: number | string = 1,
) {
  if (!isDiscordEnabled()) return;
  const { eventKey, group, event } = buildDiscordBusinessEvent(action, entityId, revision);
  await tx`INSERT INTO public.discord_notification_outbox
    (event_key,event_type,event_group,title,description,action_path)
    SELECT ${eventKey},${event.type},${group},${event.title},${event.description},${event.actionPath}
    FROM public.discord_notification_settings s
    WHERE s.id=1 AND s.master_enabled
      AND COALESCE((s.groups ->> ${group})::boolean,false)
    ON CONFLICT (event_key) DO NOTHING`;
}
