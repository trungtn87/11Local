"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown, ArrowLeft, ArrowUp, BedDouble, Coffee, Eye, EyeOff, Upload,
  LogOut, Mountain, Plus, Save, ShoppingBag, Utensils, Wrench,
} from "lucide-react";
import styles from "./categories.module.css";
import CategoryFieldsManager from "./category-fields-manager";

type Category = {
  id: string;
  name: string;
  icon: string;
  visibility: "visible" | "hidden";
  sort_order: number;
  place_count: number;
};
type Draft = { id: string; name: string; icon: string; visibility: Category["visibility"] };
const emptyDraft = (): Draft => ({ id: "", name: "", icon: "mountain", visibility: "visible" });
const icons = {
  utensils: { label: "Ăn uống", Component: Utensils },
  coffee: { label: "Cà phê", Component: Coffee },
  bed: { label: "Lưu trú", Component: BedDouble },
  mountain: { label: "Tham quan", Component: Mountain },
  "shopping-bag": { label: "Mua sắm", Component: ShoppingBag },
  wrench: { label: "Dịch vụ", Component: Wrench },
};
const iconNames = Object.keys(icons) as (keyof typeof icons)[];
const errorMessage: Record<string, string> = {
  CATEGORY_ID_EXISTS: "Mã danh mục đã tồn tại. Hãy chọn mã khác.",
  STALE_ORDER: "Danh sách đã thay đổi ở phiên khác. Hãy tải lại trước khi sắp xếp.",
  CATEGORY_NOT_FOUND: "Danh mục không còn tồn tại. Hãy tải lại.",
  INVALID_ID: "Mã chỉ gồm chữ thường, số và dấu gạch dưới, bắt đầu bằng chữ.",
  INVALID_NAME: "Tên danh mục phải có từ 1 đến 80 ký tự.",
  INVALID_ICON: "Biểu tượng không được hỗ trợ.",
  INVALID_IMAGE: "Ảnh không hợp lệ. Hãy dùng PNG, JPG hoặc WebP tối đa 2 MB.",
  INVALID_VISIBILITY: "Trạng thái không hợp lệ.",
  IMMUTABLE_CATEGORY_ID_OR_ORDER: "Không được đổi mã hoặc thứ tự qua biểu mẫu chỉnh sửa.",
};
function CategoryIcon({ name }: { name: string }) {
  if (/^custom:[0-9a-f-]{36}$/i.test(name)) return <Image src={"/api/category-icons/" + name.slice(7)} width={28} height={28} alt="" unoptimized />;
  const Icon = icons[name as keyof typeof icons]?.Component ?? Mountain;
  return <Icon size={20} aria-hidden="true" />;
}

export default function CategoryManager() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/categories", { cache: "no-store" });
      if (response.status === 401) { setAuthenticated(false); throw new Error("Phiên Admin đã hết hạn."); }
      if (!response.ok) throw new Error("Không tải được danh mục từ Neon.");
      const result = await response.json();
      setCategories(result.categories ?? []);
      setAuthenticated(true);
      return result.categories as Category[];
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then(response => response.json())
      .then(async result => {
        if (!result.authenticated) { setAuthenticated(false); return; }
        await load();
      })
      .catch(() => { setAuthenticated(false); setMessage("Không thể kết nối trang quản trị."); });
  }, [load]);

  const selectCategory = (category: Category) => {
    setCreating(false);
    setSelectedId(category.id);
    setDraft({ id: category.id, name: category.name, icon: category.icon, visibility: category.visibility });
    setMessage("");
  };
  const startCreating = () => {
    setCreating(true);
    setSelectedId(null);
    setDraft(emptyDraft());
    setMessage("");
  };
  const showError = (error: unknown) => {
    setMessage(error instanceof Error ? error.message : "Không thể lưu, vui lòng thử lại.");
  };
  const request = async (url: string, method: string, body: unknown) => {
    const response = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) { setAuthenticated(false); throw new Error("Phiên Admin đã hết hạn."); }
    if (!response.ok) throw new Error(errorMessage[result.error] || "Không thể cập nhật danh mục.");
    return result;
  };

  const uploadIcon = async (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024 || !file.size) {
      setMessage("Chỉ hỗ trợ ảnh PNG, JPG hoặc WebP tối đa 2 MB."); return;
    }
    setUploading(true); setMessage("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/admin/category-icons", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) { setAuthenticated(false); throw new Error("Phiên Admin đã hết hạn."); }
      if (!response.ok) throw new Error(errorMessage[result.error] || "Không tải ảnh lên được.");
      setDraft(current => ({ ...current, icon: result.icon }));
      setMessage("Ảnh đã tải lên. Nhấn Lưu thay đổi để áp dụng.");
    } catch (error) { showError(error); }
    finally { setUploading(false); }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || uploading) return;
    setBusy(true);
    setMessage("");
    try {
      const result = creating
        ? await request("/api/admin/categories", "POST", draft)
        : await request("/api/admin/categories/" + encodeURIComponent(draft.id), "PATCH",
            { name: draft.name, icon: draft.icon, visibility: draft.visibility });
      const loaded = await load();
      const updated = loaded.find(category => category.id === result.category.id);
      if (updated) selectCategory(updated);
      setMessage(creating ? "Đã thêm danh mục." : "Đã cập nhật danh mục.");
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  };
  const toggle = async (category: Category) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    const visibility = category.visibility === "visible" ? "hidden" : "visible";
    try {
      await request("/api/admin/categories/" + encodeURIComponent(category.id), "PATCH", { visibility });
      const loaded = await load();
      if (selectedId === category.id) {
        const updated = loaded.find(item => item.id === category.id);
        if (updated) setDraft({ id: updated.id, name: updated.name, icon: updated.icon, visibility: updated.visibility });
      }
      setMessage(visibility === "visible" ? "Danh mục đã được hiển thị." : "Đã ẩn danh mục, không xóa địa điểm.");
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  };
  const move = async (index: number, delta: number) => {
    if (busy || index + delta < 0 || index + delta >= categories.length) return;
    const next = [...categories];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setBusy(true);
    setMessage("");
    try {
      await request("/api/admin/categories/reorder", "PUT", { ids: next.map(category => category.id) });
      await load();
      setMessage("Đã lưu thứ tự danh mục.");
    } catch (error) {
      showError(error);
      try { await load(); } catch { /* The error message above is still displayed. */ }
    } finally { setBusy(false); }
  };
  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error("Mật khẩu Admin không đúng.");
      setPassword("");
      await load();
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  };

  if (authenticated === null) return <main className={styles.center}>Đang kiểm tra phiên Admin…</main>;
  if (!authenticated) return <main className={styles.center}>
    <form className={styles.login} onSubmit={login}>
      <h1>11Local Admin</h1><p>Đăng nhập để quản lý danh mục</p>
      <input type="password" autoFocus required value={password}
        onChange={event => setPassword(event.target.value)} placeholder="Mật khẩu Admin"/>
      <button disabled={busy}>Đăng nhập</button>
      {message && <p className={styles.error} role="alert">{message}</p>}
      <Link href="/admin">Quay lại quản lý địa điểm</Link>
    </form>
  </main>;

  const visibleCount = categories.filter(category => category.visibility === "visible").length;
  return <main className={styles.shell}>
    <header className={styles.header}>
      <div><Link href="/admin" className={styles.back}><ArrowLeft size={16}/> Quản lý địa điểm</Link>
        <h1>Quản lý danh mục</h1>
        <p>11Local · Dữ liệu thật từ Neon</p></div>
      <button type="button" className={styles.outline} onClick={async () => {
        await fetch("/api/admin/session", { method: "DELETE" });
        setAuthenticated(false);
      }}><LogOut size={16}/> Đăng xuất</button>
    </header>
    <div className={styles.stats} aria-label="Thống kê danh mục">
      <div><strong>{categories.length}</strong><span>Tổng danh mục</span></div>
      <div><strong>{visibleCount}</strong><span>Đang hiển thị</span></div>
      <div><strong>{categories.length - visibleCount}</strong><span>Đang ẩn</span></div>
    </div>
    {message && <p className={styles.notice} role="status">{message}</p>}
    <div className={styles.columns}>
      <section className={styles.panel}>
        <div className={styles.panelTop}>
          <h2>Danh sách</h2>
          <button className={styles.primary} type="button" onClick={startCreating} disabled={busy}>
            <Plus size={16}/> Thêm mới
          </button>
        </div>
        <p className={styles.hint}>Dùng mũi tên để thay đổi thứ tự xuất hiện trên website.</p>
        <div className={styles.rows}>
          {categories.map((category, index) => <div key={category.id} className={styles.category}
            data-selected={selectedId === category.id && !creating}>
            <button className={styles.selectCategory} type="button" onClick={() => selectCategory(category)}
              aria-label={"Chỉnh sửa " + category.name}>
              <span className={styles.icon}><CategoryIcon name={category.icon}/></span>
              <span className={styles.rowContent}>
                <strong>{category.name}</strong>
                <small>{category.id} · {category.place_count} địa điểm</small>
              </span>
            </button>
            <div className={styles.rowActions}>
              <button type="button" disabled={busy || index === 0} onClick={() => void move(index, -1)}
                title="Lên một vị trí" aria-label={"Đưa " + category.name + " lên"}><ArrowUp size={16}/></button>
              <button type="button" disabled={busy || index === categories.length - 1}
                onClick={() => void move(index, 1)} title="Xuống một vị trí"
                aria-label={"Đưa " + category.name + " xuống"}><ArrowDown size={16}/></button>
              <button type="button" disabled={busy} onClick={() => void toggle(category)}
                className={category.visibility === "visible" ? styles.visible : styles.hidden}
                title={category.visibility === "visible" ? "Ẩn danh mục" : "Hiển thị danh mục"}
                aria-label={(category.visibility === "visible" ? "Ẩn " : "Hiện ") + category.name}
                aria-pressed={category.visibility === "visible"}>
                {category.visibility === "visible" ? <Eye size={17}/> : <EyeOff size={17}/>}
              </button>
            </div>
          </div>)}
          {!categories.length && <p className={styles.hint}>{loading ? "Đang tải…" : "Chưa có danh mục."}</p>}
        </div>
      </section>
      <section className={styles.panel}>
        <h2>{creating ? "Thêm danh mục" : selectedId ? "Chỉnh sửa danh mục" : "Thông tin danh mục"}</h2>
        {!creating && !selectedId ? <p className={styles.empty}>Chọn một danh mục ở bên trái để chỉnh sửa, hoặc nhấn “Thêm mới”.</p> :
          <form className={styles.form} onSubmit={save}>
            <label>Mã danh mục *
              <input required minLength={1} maxLength={40} pattern="[a-z][a-z0-9_]*"
                value={draft.id} readOnly={!creating} disabled={!creating}
                onChange={event => setDraft({ ...draft, id: event.target.value })}
                placeholder="vi_du_danh_muc"/>
              <small>{creating ? "Mã chỉ tạo một lần và không thể đổi về sau." : "Mã cố định để giữ liên kết với các địa điểm."}</small>
            </label>
            <label>Tên danh mục *
              <input required maxLength={80} value={draft.name}
                onChange={event => setDraft({ ...draft, name: event.target.value })}
                placeholder="Ví dụ: Chợ địa phương"/>
            </label>
            <label>Biểu tượng
              <select value={draft.icon.startsWith("custom:") ? "custom" : draft.icon} onChange={event => setDraft({ ...draft, icon: event.target.value === "custom" ? draft.icon : event.target.value })}>
                {draft.icon.startsWith("custom:") && <option value="custom">Ảnh tự thiết kế (đã tải lên)</option>}
                {!draft.icon.startsWith("custom:") && !iconNames.includes(draft.icon as keyof typeof icons) &&
                  <option value={draft.icon}>{draft.icon} (hiện tại)</option>}
                {iconNames.map(name => <option key={name} value={name}>{icons[name].label}</option>)}
              </select>
            </label>
            <label className={styles.uploadLabel}><Upload size={16}/> {uploading ? "Đang xử lý ảnh…" : "Tải icon tự thiết kế (PNG, JPG, WebP)"}
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading || busy} onChange={event => { void uploadIcon(event.target.files?.[0]); event.target.value = ""; }}/>
              <small>Ảnh tối đa 2 MB, tự chuẩn hóa về WebP vuông. Dùng Lưu thay đổi để áp dụng.</small>
            </label>
            <div className={styles.preview}><span className={styles.icon}><CategoryIcon name={draft.icon}/></span>
              <span>{draft.name.trim() || "Tên danh mục"}</span></div>
            <label>Trạng thái
              <select value={draft.visibility}
                onChange={event => setDraft({ ...draft, visibility: event.target.value as Category["visibility"] })}>
                <option value="visible">Hiển thị trên website</option>
                <option value="hidden">Ẩn khỏi website</option>
              </select>
              <small>Ẩn danh mục không xóa dữ liệu địa điểm đã có.</small>
            </label>
            <button type="submit" className={styles.primary} disabled={busy || uploading}>
              <Save size={16}/>{busy ? "Đang lưu…" : creating ? "Tạo danh mục" : "Lưu thay đổi"}
            </button>
          </form>}
        <p className={styles.footnote}>Chọn danh mục để quản lý các trường thông tin đặc thù ở phía dưới. Không xóa dữ liệu địa điểm khi ẩn danh mục hoặc trường.</p>
      </section>
    </div>
    {selectedId && !creating && <CategoryFieldsManager key={selectedId} categoryId={selectedId}
      categoryName={categories.find(item => item.id === selectedId)?.name || selectedId}/>}
  </main>;
}
