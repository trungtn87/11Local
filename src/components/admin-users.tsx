"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, LockKeyhole, RefreshCw, Search, ShieldCheck, UserRoundX, UsersRound } from "lucide-react";

type Status = "pending" | "approved" | "rejected" | "blocked";
type User = {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url?: string | null;
  status: Status;
  created_at: string;
  last_login_at: string | null;
  note: string | null;
};
const labels: Record<Status, string> = {
  pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối", blocked: "Đã khóa",
};
const filters = ["all", "pending", "approved", "rejected", "blocked"] as const;
type Filter = typeof filters[number];
const formatDate = (input: string | null) =>
  input ? new Date(input).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Chưa có";

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("pending");
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const body: { users?: User[] } = await response.json();
      if (!Array.isArray(body.users)) throw new Error();
      setUsers(body.users);
      setMessage("");
    } catch {
      setMessage("Không thể tải danh sách. Kiểm tra kết nối hoặc đăng nhập lại Admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/users", { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((body: { users?: User[] }) => { if (active && Array.isArray(body.users)) setUsers(body.users); })
      .catch(() => { if (active) setMessage("Không thể tải danh sách thành viên."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({
    all: users.length,
    pending: users.filter((user) => user.status === "pending").length,
    approved: users.filter((user) => user.status === "approved").length,
    rejected: users.filter((user) => user.status === "rejected").length,
    blocked: users.filter((user) => user.status === "blocked").length,
  }), [users]);

  const items = useMemo(() => users.filter((user) =>
    (filter === "all" || user.status === filter) &&
    (user.display_name + " " + (user.email || "")).toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))
  ), [users, filter, search]);

  function startEdit(user: User) {
    setEditing(editing === user.id ? null : user.id);
    setNote(user.note || "");
    setMessage("");
  }

  async function decide(user: User, status: Status, newNote: string) {
    const prompt = status === "blocked"
      ? "Khóa tài khoản này và thu hồi ngay quyền đóng góp?"
      : status === "rejected"
        ? "Từ chối tài khoản này?"
        : status === "approved"
          ? "Cho phép tài khoản này đăng nhập và đóng góp ảnh?"
          : "Chuyển tài khoản này về trạng thái chờ duyệt?";
    if (status !== user.status && !window.confirm(prompt)) return;
    setBusy(user.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users/" + encodeURIComponent(user.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: newNote.trim().slice(0, 500) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body.error === "string" ? body.error : "Không lưu được tài khoản.");
      }
      await refresh();
      setEditing(null);
      setMessage("Đã cập nhật " + (user.email || user.display_name) + ": " + labels[status] + ".");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật tài khoản.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="admin-panel" id="quan-ly-tai-khoan">
      <div className="admin-section-heading">
        <div><h2>Quản lý thành viên Google</h2><p>Chỉ tài khoản đã duyệt mới được đăng nhập và gửi ảnh. Tài khoản mới mặc định chờ duyệt.</p></div>
        <button type="button" className="admin-icon-action" onClick={() => { setLoading(true); void refresh(); }} aria-label="Tải lại danh sách" title="Tải lại danh sách">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="admin-member-stats">
        <div><Clock3 size={18} /><strong>{counts.pending}</strong><span>Chờ duyệt</span></div>
        <div><ShieldCheck size={18} /><strong>{counts.approved}</strong><span>Đã duyệt</span></div>
        <div><LockKeyhole size={18} /><strong>{counts.blocked}</strong><span>Đã khóa</span></div>
      </div>

      <div className="admin-user-tools">
        <label className="admin-search-input"><Search size={18} aria-hidden="true" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            aria-label="Tìm thành viên" placeholder="Tìm tên hoặc email Google…" />
        </label>
        <div className="admin-filter-scroll" role="group" aria-label="Lọc trạng thái thành viên">
          {filters.map((status) => <button type="button" key={status}
            className={"admin-filter" + (filter === status ? " active" : "")}
            aria-pressed={filter === status} onClick={() => setFilter(status)}>
            {status === "all" ? "Tất cả" : labels[status]} <span>{counts[status]}</span>
          </button>)}
        </div>
      </div>

      {loading ? <div className="admin-empty"><p>Đang tải danh sách thành viên…</p></div>
        : items.length === 0 ? <div className="admin-empty"><UsersEmptyIcon /><h3>Không có thành viên phù hợp</h3><p>Thử chọn bộ lọc khác hoặc xóa từ khóa tìm kiếm.</p></div>
          : <div className="admin-user-list">{items.map((user) => (
            <article className="admin-user-card" key={user.id}>
              <div className="admin-user-details">
                {user.avatar_url
                  ? <img className="admin-user-avatar" src={user.avatar_url} alt="" referrerPolicy="no-referrer" />
                  : <span className="admin-user-avatar admin-avatar-placeholder">{(user.display_name || user.email || "G").charAt(0).toUpperCase()}</span>}
                <div className="admin-user-name">
                  <strong>{user.display_name || "Thành viên"}</strong>
                  <span>{user.email || "Chưa có email"}</span>
                  <small>Tham gia: {formatDate(user.created_at)} · Đăng nhập gần nhất: {formatDate(user.last_login_at)}</small>
                </div>
                <span className={"admin-status-badge " + user.status}>{labels[user.status]}</span>
              </div>
              {user.note && editing !== user.id && <p className="admin-user-note">Ghi chú: {user.note}</p>}
              <div className="admin-user-actions">
                {user.status !== "approved" && <button type="button" className="primary" disabled={busy === user.id}
                  onClick={() => void decide(user, "approved", user.note || "")}><Check size={15} /> Duyệt</button>}
                {user.status !== "rejected" && <button type="button" className="secondary" disabled={busy === user.id}
                  onClick={() => void decide(user, "rejected", user.note || "")}><UserRoundX size={15} /> Từ chối</button>}
                {user.status !== "blocked" && <button type="button" className="secondary" disabled={busy === user.id}
                  onClick={() => void decide(user, "blocked", user.note || "")}><LockKeyhole size={15} /> Khóa</button>}
                <button type="button" className="admin-text-action" onClick={() => startEdit(user)}>
                  {editing === user.id ? "Đóng" : "Sửa ghi chú"}
                </button>
              </div>
              {editing === user.id && <div className="admin-user-editor">
                <label className="field">Ghi chú nội bộ
                  <textarea maxLength={500} value={note} onChange={(event) => setNote(event.target.value)}
                    placeholder="Thông tin hỗ trợ xét duyệt (chỉ Admin xem)" />
                </label>
                <button type="button" className="primary" disabled={busy === user.id}
                  onClick={() => void decide(user, user.status, note)}>Lưu ghi chú</button>
              </div>}
            </article>
          ))}</div>}
      {message && <p role="status" className="status">{message}</p>}
    </section>
  );
}

function UsersEmptyIcon() {
  return <UsersRound size={28} aria-hidden="true" />;
}
