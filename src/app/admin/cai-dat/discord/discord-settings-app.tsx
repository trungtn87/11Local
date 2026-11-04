"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, Bell, CheckCircle2, Clock3, LockKeyhole, RefreshCw,
  RotateCcw, Save, Send, Settings2, ShieldCheck, XCircle,
} from "lucide-react";
import {
  DEFAULT_DISCORD_GROUP_SETTINGS, DISCORD_GROUPS, fallbackDiscordGroup,
  type DiscordGroup, type DiscordSettings,
} from "@/lib/discord-settings";
import styles from "./discord-settings.module.css";

type HistoryRow = {
  id: string;
  event_type: string;
  event_group: string | null;
  title: string;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
};

type ResponseData = {
  settings: DiscordSettings;
  environmentEnabled: boolean;
  configured: boolean;
  history: HistoryRow[];
};

type Draft = Pick<DiscordSettings, "enabled" | "groups" | "version">;
const groupLabels: Record<DiscordGroup | "test", string> = {
  contribution: "Đóng góp & ảnh", review: "Đánh giá",
  ownership: "Xác minh & phân quyền", moderation: "Kết quả kiểm duyệt",
  system: "Cảnh báo hệ thống", digest: "Báo cáo hằng ngày", test: "Kiểm tra",
};
const statuses: Record<HistoryRow["status"], string> = {
  sent: "Đã gửi", pending: "Đang chờ", processing: "Đang gửi", failed: "Thất bại",
};
function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short",
  });
}

export default function DiscordSettingsApp() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [draft, setDraft] = useState<Draft>({
    enabled: false, version: 1, groups: { ...DEFAULT_DISCORD_GROUP_SETTINGS },
  });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);

  const refresh = useCallback(async (preserveNotice = false) => {
    try {
      const response = await fetch("/api/admin/discord", { cache: "no-store" });
      if (response.status === 401) {
        setUnauthorized(true);
        setError("Phiên Admin đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }
      if (!response.ok) throw new Error("Không thể tải cấu hình Discord. Kiểm tra migration 0014 và 0015 trên Neon.");
      const body = await response.json() as ResponseData;
      setData(body);
      setDraft({
        enabled: body.settings.enabled,
        groups: { ...body.settings.groups },
        version: body.settings.version,
      });
      if (!preserveNotice) setError("");
      setUnauthorized(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải cấu hình.");
    } finally { setLoading(false); }
  }, []);

  // Initial data arrives asynchronously; avoid setState in the synchronous effect body.
  useEffect(() => {
    let active = true;
    void fetch("/api/admin/discord", { cache: "no-store" })
      .then(async response => {
        if (response.status === 401) {
          throw new Error("Phiên Admin đã hết hạn. Vui lòng đăng nhập lại.");
        }
        if (!response.ok) {
          throw new Error("Không thể tải cấu hình Discord. Kiểm tra migration 0014 và 0015 trên Neon.");
        }
        return await response.json() as ResponseData;
      })
      .then(body => {
        if (!active) return;
        setData(body);
        setDraft({ enabled: body.settings.enabled, groups: { ...body.settings.groups },
          version: body.settings.version });
        setError("");
      })
      .catch(cause => {
        if (!active) return;
        const message = cause instanceof Error ? cause.message : "Không thể tải cấu hình.";
        setUnauthorized(message.includes("Phiên Admin"));
        setError(message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const dirty = Boolean(data) && (
    draft.enabled !== data!.settings.enabled ||
    DISCORD_GROUPS.some(group => draft.groups[group.key] !== data!.settings.groups[group.key])
  );
  const canTest = Boolean(data && data.environmentEnabled && data.configured);

  async function save() {
    if (!dirty || working) return;
    setWorking("save"); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/discord", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = await response.json();
      if (response.status === 409) throw new Error("Cấu hình đã được thay đổi ở phiên khác. Tải lại trước khi lưu.");
      if (!response.ok) throw new Error("Không lưu được cấu hình Discord.");
      const settings = body.settings as DiscordSettings;
      setData(previous => previous ? { ...previous, settings } : previous);
      setDraft({ enabled: settings.enabled, groups: { ...settings.groups }, version: settings.version });
      setMessage("Đã lưu cấu hình Discord trong Neon.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được cấu hình.");
    } finally { setWorking(null); }
  }

  async function runAction(action: "test" | "retry", id?: string) {
    if (!canTest || working) return;
    setWorking(action + (id || "")); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/discord/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : {}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(
        response.status === 409
          ? "Không thể gửi lại: thông báo đã được xử lý hoặc nhóm đang tắt."
          : "Discord chưa xác nhận gửi thành công. Kiểm tra lịch sử và cấu hình Webhook.",
      );
      setMessage(body.status === "sent"
        ? "Discord đã xác nhận nhận thông báo."
        : "Đã đưa vào hàng đợi; chờ gửi lại theo lịch xử lý.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Có lỗi kết nối.");
    } finally {
      setWorking(null);
      // Always refresh the recorded result, including failed attempts.
      await refresh(true);
    }
  }

  return <main className={styles.shell}>
    <div className={styles.container}>
      <nav className={styles.breadcrumb} aria-label="Điều hướng">
        <Link href="/admin"><ArrowLeft size={16} /> Quay lại Admin</Link>
        <span>/</span><span>Cài đặt</span><span>/</span><strong>Discord</strong>
      </nav>

      <div className={styles.heading}>
        <div className={styles.headingIcon}><Bell size={24}/></div>
        <div><p className={styles.eyebrow}>11LOCAL ADMIN · CÀI ĐẶT</p>
          <h1>Thông báo Discord</h1>
          <p>Quản lý các sự kiện cần Admin xử lý. Không cần sửa biến môi trường để bật/tắt từng nhóm.</p>
        </div>
        <button type="button" className={styles.outline} onClick={() => { setLoading(true); void refresh(); }} disabled={loading || Boolean(working)}>
          <RefreshCw size={16}/> Làm mới
        </button>
      </div>

      {loading && !data && <section className={styles.panel} role="status">Đang tải cấu hình Discord…</section>}
      {error && <div className={styles.error} role="alert">{error}
        {unauthorized && <Link href="/admin">Đăng nhập Admin</Link>}</div>}
      {message && <div className={styles.success} role="status">{message}</div>}
      {data && <>
        <div className={styles.summary}>
          <div><span>Webhook</span><strong className={data.configured ? styles.good : styles.bad}>
            {data.configured ? <CheckCircle2 size={18}/> : <XCircle size={18}/>}
            {data.configured ? "Đã cấu hình" : "Chưa cấu hình"}
          </strong><small>Địa chỉ Webhook được giữ bí mật trên máy chủ.</small></div>
          <div><span>Cổng vận hành</span><strong className={data.environmentEnabled ? styles.good : styles.bad}>
            {data.environmentEnabled ? "Đã mở trên server" : "Chưa mở trên server"}
          </strong><small>Biến DISCORD_NOTIFICATIONS_ENABLED cần là true.</small></div>
          <div><span>Trạng thái thông báo</span><strong>
            {data.environmentEnabled && data.configured && data.settings.enabled
              ? "Đã bật theo cấu hình" : "Đang tắt / chưa sẵn sàng"}
          </strong><small>Chỉ gửi thực tế khi Webhook và worker hoạt động.</small></div>
        </div>

        <section className={styles.panel} aria-labelledby="general-title">
          <div className={styles.panelHeader}>
            <div><h2 id="general-title"><Settings2 size={20}/> Cấu hình chung</h2>
              <p>Thay đổi chỉ áp dụng sau khi bấm Lưu cấu hình.</p></div>
            <label className={styles.toggle}>
              <input type="checkbox" checked={draft.enabled}
                onChange={event => setDraft(current => ({ ...current, enabled: event.target.checked }))}/>
              <span className={styles.slider}/><span className={styles.toggleText}>
                {draft.enabled ? "Bật thông báo" : "Tắt thông báo"}
              </span>
            </label>
          </div>

          <div className={styles.groups}>
            {DISCORD_GROUPS.map(group =>
              <label className={styles.group} key={group.key}>
                <span className={styles.groupText}><strong>{group.label}</strong>
                  <small>{group.description}</small>
                  {(group.key === "system" || group.key === "digest") &&
                    <em>Hoàn thiện ở bước {group.key === "digest" ? "4" : "5"}</em>}
                </span>
                <input type="checkbox" checked={draft.groups[group.key]}
                  onChange={event => setDraft(current => ({
                    ...current,
                    groups: { ...current.groups, [group.key]: event.target.checked },
                  }))}/>
              </label>
            )}
          </div>
          <div className={styles.actions}>
            <span>{dirty ? "Có thay đổi chưa lưu" : "Cấu hình đã đồng bộ"} · Cập nhật: {formatDate(data.settings.updatedAt)}</span>
            <button type="button" className={styles.primary} disabled={!dirty || Boolean(working) || loading}
              onClick={() => void save()}><Save size={17}/> {working === "save" ? "Đang lưu…" : "Lưu cấu hình"}</button>
          </div>
          {!data.environmentEnabled && <p className={styles.hint}>
            Cổng vận hành đang đóng. Bạn vẫn có thể lưu tùy chọn, nhưng phải bật biến môi trường trên server mới gửi được.
          </p>}
        </section>

        <section className={styles.panel} aria-labelledby="test-title">
          <div className={styles.panelHeader}>
            <div><h2 id="test-title"><Send size={20}/> Kiểm tra kết nối</h2>
              <p>Gửi một thông báo thử vào Discord. Thao tác này không thay đổi nhóm thông báo.</p>
            </div>
            <button type="button" className={styles.outline} disabled={!canTest || Boolean(working)}
              onClick={() => void runAction("test")}>
              <Send size={16}/> {working === "test" ? "Đang thử…" : "Gửi thông báo thử"}
            </button>
          </div>
          <p className={styles.hint}><ShieldCheck size={16}/> Chỉ Admin mới được gửi thử và xem lịch sử; không hiển thị Webhook URL hay token.</p>
        </section>

        <section className={styles.panel} aria-labelledby="history-title">
          <div className={styles.panelHeader}>
            <div><h2 id="history-title"><Clock3 size={20}/> Lịch sử gửi gần đây</h2>
              <p>30 thông báo mới nhất; chỉ lưu mã lỗi an toàn, không lưu nội dung nhạy cảm.</p></div>
            <span className={styles.counter}>{data.history.length} bản ghi</span>
          </div>
          {data.history.length ? <div className={styles.tableScroll}>
            <table><thead><tr><th>Thông báo</th><th>Thời gian</th>
              <th>Trạng thái</th><th>Số lần thử</th><th>Thao tác</th></tr></thead>
              <tbody>{data.history.map(item => {
                const group = fallbackDiscordGroup(item.event_type, item.event_group);
                const groupEnabled = group === "test" || (data.settings.enabled && data.settings.groups[group]);
                return <tr key={item.id}>
                  <td><strong>{item.title}</strong><small>{groupLabels[group]}</small>
                    {item.last_error && <code>{item.last_error}</code>}</td>
                  <td>{formatDate(item.sent_at || item.created_at)}</td>
                  <td><span className={styles.status} data-status={item.status}>
                    {statuses[item.status]}</span></td>
                  <td>{item.attempts}</td>
                  <td>{item.status === "failed"
                    ? <button type="button" className={styles.retry}
                      disabled={!canTest || !groupEnabled || Boolean(working)}
                      title={!groupEnabled ? "Bật nhóm thông báo và lưu trước khi gửi lại" : "Gửi lại thông báo"}
                      onClick={() => void runAction("retry", item.id)}><RotateCcw size={14}/> Gửi lại</button>
                    : <span className={styles.muted}>—</span>}</td>
                </tr>;
              })}</tbody>
            </table>
          </div> : <div className={styles.empty}>Chưa có thông báo nào trong lịch sử.</div>}
        </section>

        <p className={styles.footer}><LockKeyhole size={15}/>
          Việc bật/tắt được lưu trong Neon. Webhook, token dispatcher và thông tin xác minh cá nhân không xuất hiện tại đây.
        </p>
      </>}
    </div>
  </main>;
}
