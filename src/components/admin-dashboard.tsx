"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Album, ArrowLeft, CheckCircle2, ChevronRight, House, Images,
  LayoutDashboard, LogOut, MapPin, ShieldCheck, Trash2, UsersRound
} from "lucide-react";
import { AdminContentManager } from "./admin-content-manager";
import { AdminPlaceManager } from "./admin-place-manager";
import { AdminUsers } from "./admin-users";

type AlbumRow = { id: string; title: string };
type Photo = { id: string; caption: string; album_title: string; uploader: string };
type Section = "overview" | "members" | "memories" | "places" | "photos";
type Props = {
  authenticated: boolean;
  albums: AlbumRow[];
  photos: Photo[];
};

const navigation = [
  { id: "overview" as const, label: "Tổng quan", icon: LayoutDashboard },
  { id: "members" as const, label: "Thành viên", icon: UsersRound },
  { id: "memories" as const, label: "Quản lý kỷ niệm", icon: Album },
  { id: "places" as const, label: "Quản lý địa điểm", icon: MapPin },
  { id: "photos" as const, label: "Quản lý ảnh", icon: Images },
];

export function AdminDashboard({ authenticated, albums, photos }: Props) {
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [message, setMessage] = useState("");
  const [busyPhoto, setBusyPhoto] = useState<string | null>(null);
  const [managedPhotos, setManagedPhotos] = useState(photos);
  const [memberStats, setMemberStats] = useState<{ total: number; pending: number } | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    fetch("/api/admin/users", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Không tải được số liệu");
        return response.json();
      })
      .then((body: { users?: { status: string }[] }) => {
        if (active && Array.isArray(body.users)) {
          setMemberStats({
            total: body.users.length,
            pending: body.users.filter((member) => member.status === "pending").length,
          });
        }
      })
      .catch(() => { if (active) setMemberStats(null); });
    return () => { active = false; };
  }, [authenticated, section]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoginBusy(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.status === 401) throw new Error("Mật khẩu quản trị chưa đúng.");
      if (!response.ok) throw new Error("Không thể đăng nhập Admin. Kiểm tra cấu hình máy chủ.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không kết nối được máy chủ.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      window.location.reload();
    } catch {
      setMessage("Không thể đăng xuất Admin. Vui lòng thử lại.");
    }
  }

  async function removePhoto(photo: Photo) {
    if (!window.confirm("Xóa vĩnh viễn ảnh này khỏi album \"" + photo.album_title + "\"? Không thể khôi phục ảnh đã xóa.")) return;
    setBusyPhoto(photo.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/photos/" + encodeURIComponent(photo.id), { method: "DELETE" });
      if (!response.ok) throw new Error("Không thể xóa ảnh. Vui lòng thử lại.");
      setManagedPhotos((rows) => rows.filter((row) => row.id !== photo.id));
      setMessage("Đã xóa ảnh khỏi album.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa ảnh.");
    } finally {
      setBusyPhoto(null);
    }
  }

  if (!authenticated) {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-intro">
          <div className="admin-login-mark"><ShieldCheck size={30} aria-hidden="true" /></div>
          <p className="admin-eyebrow">KHU VỰC RIÊNG TƯ</p>
          <h1>Quản trị Nhà của Gấu</h1>
          <p>Không gian quản lý album, kỷ niệm và những bức ảnh của người thân.</p>
          <Link href="/" className="admin-back-link"><ArrowLeft size={17} /> Về trang gia đình</Link>
        </div>
        <form className="admin-login-form" onSubmit={(event) => void login(event)}>
          <h2>Đăng nhập quản trị</h2>
          <p>Dùng mật khẩu Admin đã cấu hình trên máy chủ. Đăng nhập Google của thành viên là một phiên riêng.</p>
          <label className="field">
            Mật khẩu Admin
            <input type="password" autoComplete="current-password" required value={password}
              onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu quản trị" />
          </label>
          <button type="submit" className="primary admin-full-button" disabled={loginBusy}>
            {loginBusy ? "Đang kiểm tra…" : "Vào trang quản trị"}
          </button>
          {message && <p className="status" role="alert">{message}</p>}
          <div className="admin-login-separator">Đăng nhập tài khoản người thân?</div>
          <Link href="/dang-nhap" className="secondary admin-full-button">Đăng nhập bằng Google</Link>
        </form>
      </div>
    );
  }

  const heading = navigation.find((item) => item.id === section)?.label || "Tổng quan";

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Menu quản trị">
        <div className="admin-sidebar-brand"><House size={21} /><div><strong>Nhà của Gấu</strong><small>Không gian quản trị</small></div></div>
        <nav className="admin-sidebar-nav" aria-label="Chức năng quản trị">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} className={"admin-nav-item" + (section === id ? " active" : "")}
              aria-current={section === id ? "page" : undefined} onClick={() => { setSection(id); setMessage(""); }}>
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
              {id === "members" && (memberStats?.pending || 0) > 0 && <span className="admin-nav-count">{memberStats?.pending}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" className="admin-nav-item"><ArrowLeft size={18} /> Về trang chủ</Link>
          <button type="button" className="admin-nav-item" onClick={() => void logout()}><LogOut size={18} /> Đăng xuất Admin</button>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-workspace-header">
          <div><p className="admin-eyebrow">BẢNG ĐIỀU KHIỂN</p><h1>{heading}</h1></div>
          <span className="admin-admin-pill"><ShieldCheck size={16} /> Quản trị viên</span>
        </header>
        <nav className="admin-mobile-tabs" aria-label="Menu quản trị trên điện thoại">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} className={section === id ? "active" : ""}
              aria-current={section === id ? "page" : undefined} onClick={() => { setSection(id); setMessage(""); }}>
              <Icon size={17} aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>

        {section === "overview" && <>
          <div className="admin-welcome"><p className="admin-eyebrow">GIA ĐÌNH GẤU</p>
            <h2>Mọi kỷ niệm đều đáng được nâng niu</h2>
            <p>Duyệt tài khoản người thân, quản lý ảnh và chăm chút những album của cả nhà tại một nơi.</p>
          </div>
          <div className="admin-stats">
            <button type="button" className="admin-stat-card" onClick={() => setSection("members")}>
              <span className="admin-stat-icon members"><UsersRound size={21} /></span>
              <span className="admin-stat-number">{memberStats?.pending ?? "—"}</span><span className="admin-stat-caption">Tài khoản chờ duyệt</span><ChevronRight size={17} />
            </button>
            <button type="button" className="admin-stat-card" onClick={() => setSection("photos")}>
              <span className="admin-stat-icon photos"><Images size={21} /></span>
              <span className="admin-stat-number">{managedPhotos.length}</span><span className="admin-stat-caption">Ảnh trong album</span><ChevronRight size={17} />
            </button>
            <button type="button" className="admin-stat-card" onClick={() => setSection("memories")}>
              <span className="admin-stat-icon albums"><Album size={21} /></span>
              <span className="admin-stat-number">{albums.length}</span><span className="admin-stat-caption">Album gia đình</span><ChevronRight size={17} />
            </button>
          </div>
          <section className="admin-panel">
            <div className="admin-section-heading"><div><h2>Quản lý nhanh</h2><p>Chọn một mục để tiếp tục</p></div></div>
            <div className="admin-task-list">
              <button type="button" onClick={() => setSection("members")}><UsersRound size={20} />
                <span><strong>Duyệt thành viên mới</strong><small>{memberStats?.pending === undefined ? "Kiểm tra yêu cầu tham gia" : memberStats.pending + " tài khoản đang chờ"}</small></span><ChevronRight size={18} /></button>
              <button type="button" onClick={() => setSection("photos")}><Images size={20} />
                <span><strong>Quản lý ảnh</strong><small>Ảnh tự hiển thị sau khi thành viên được duyệt đăng lên · Có thể xóa khi cần</small></span><ChevronRight size={18} /></button>
              <button type="button" onClick={() => setSection("memories")}><Album size={20} />
                <span><strong>Quản lý album và cột mốc</strong><small>Thêm, sửa, lưu trữ nội dung</small></span><ChevronRight size={18} /></button>
            </div>
              <button type="button" onClick={() => setSection("places")}><MapPin size={20} />
                <span><strong>Quản lý địa điểm bản đồ</strong><small>Danh mục, ghim, ẩn/hiện và album liên quan</small></span><ChevronRight size={18} /></button>
          </section>
        </>}
        {section === "members" && <AdminUsers />}
        {section === "memories" && <AdminContentManager />}
        {section === "places" && <AdminPlaceManager />}
        {section === "photos" && <section className="admin-panel">
          <div className="admin-section-heading">
            <div><h2>Ảnh trong album</h2><p>Ảnh được công khai ngay sau khi thành viên đã duyệt tải lên. Xóa vĩnh viễn ảnh không phù hợp tại đây.</p></div>
            <span className="admin-count-pill">{managedPhotos.length} ảnh</span>
          </div>
          {managedPhotos.length ? <div className="admin-photo-grid">
            {managedPhotos.map((photo) => <article className="admin-photo-card" key={photo.id}>
              <img src={"/api/photos/" + encodeURIComponent(photo.id)} alt={"Ảnh thuộc album " + photo.album_title} loading="lazy" />
              <div className="admin-photo-info">
                <strong>{photo.album_title}</strong><span>Đăng bởi {photo.uploader}</span>
                {photo.caption && <p>{photo.caption}</p>}
                <div className="admin-photo-actions"><button type="button" className="secondary" disabled={busyPhoto === photo.id}
                  onClick={() => void removePhoto(photo)}><Trash2 size={16} /> {busyPhoto === photo.id ? "Đang xóa…" : "Xóa ảnh"}</button></div>
              </div>
            </article>)}
          </div> : <div className="admin-empty"><CheckCircle2 size={28} /><h3>Chưa có ảnh</h3><p>Ảnh thành viên đăng lên sẽ được hiển thị tại đây.</p></div>}
        </section>}
        {message && <p className="status admin-toast" role="status">{message}</p>}
      </div>
    </div>
  );
}
