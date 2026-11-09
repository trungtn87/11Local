"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Album, Archive, CalendarDays, MapPin, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";

type Kind = "album" | "place" | "milestone";
type Row = {
  id: string; title: string; description?: string; details?: string;
  event_date?: string | null; visited_on?: string | null;
  latitude?: number; longitude?: number; album_id?: string | null;
  archived_at?: string | null; photo_count?: number;
};
type Data = { albums: Row[]; places: Row[]; milestones: Row[] };
const kinds = [
  { id: "album" as const, title: "Album", icon: Album },
  { id: "place" as const, title: "Địa điểm", icon: MapPin },
  { id: "milestone" as const, title: "Cột mốc", icon: CalendarDays },
];
const plural: Record<Kind, keyof Data> = { album: "albums", place: "places", milestone: "milestones" };
const labels: Record<Kind, string> = { album: "album", place: "địa điểm", milestone: "cột mốc" };
const empty = () => ({ title: "", description: "", details: "", event_date: "", visited_on: "", latitude: "", longitude: "", album_id: "" });

export function AdminContentManager() {
  const [data, setData] = useState<Data>({ albums: [], places: [], milestones: [] });
  const [tab, setTab] = useState<Kind>("album");
  const [item, setItem] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(empty);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/family", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const body: Data = await response.json();
      setData(body);
    } catch {
      setMessage("Không thể tải danh sách quản trị.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const rows = useMemo(() => data[plural[tab]].filter((row) =>
    (tab !== "album" || showArchived || !row.archived_at) &&
    row.title.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))
  ), [data, tab, showArchived, search]);

  function closeEditor() { setEditing(false); setItem(null); setValues(empty()); }
  function switchTab(next: Kind) { setTab(next); setSearch(""); closeEditor(); setMessage(""); }
  function openEditor(row: Row | null) {
    setItem(row);
    setEditing(true);
    setValues(row ? {
      title: row.title, description: row.description || "", details: row.details || "",
      event_date: row.event_date || "", visited_on: row.visited_on || "",
      latitude: row.latitude === undefined ? "" : String(row.latitude),
      longitude: row.longitude === undefined ? "" : String(row.longitude),
      album_id: row.album_id || "",
    } : empty());
    setMessage("");
  }
  function set(key: string, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const update = Boolean(item);
    try {
      const response = await fetch("/api/admin/family", {
        method: update ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, ...values, ...(item ? { id: item.id } : {}) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Không lưu được.");
      await refresh();
      closeEditor();
      setMessage(update ? "Đã cập nhật thành công." : "Đã tạo nội dung mới.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu.");
    } finally { setBusy(false); }
  }

  async function remove(row: Row) {
    const question = tab === "album"
      ? "Lưu trữ album này? Ảnh sẽ được giữ nguyên và có thể khôi phục lại."
      : "Xóa vĩnh viễn " + labels[tab] + " \"" + row.title + "\"?";
    if (!window.confirm(question)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/family", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, id: row.id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Không thể xóa.");
      await refresh();
      if (item?.id === row.id) closeEditor();
      setMessage(tab === "album" ? "Đã lưu trữ album. Ảnh vẫn được giữ nguyên." : "Đã xóa " + labels[tab] + ".");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể xóa."); }
    finally { setBusy(false); }
  }
  async function restore(row: Row) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/family", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "album", id: row.id, restore: true }),
      });
      if (!response.ok) throw new Error();
      await refresh();
      setMessage("Đã khôi phục album.");
    } catch { setMessage("Không thể khôi phục album."); }
    finally { setBusy(false); }
  }

  return (
    <section className="admin-panel admin-content-manager" id="quan-ly-noi-dung">
      <div className="admin-section-heading">
        <div><h2>Album, địa điểm và cột mốc</h2><p>Quản lý các kỷ niệm của gia đình tại một nơi.</p></div>
      </div>
      <div className="admin-content-tabs" role="group" aria-label="Loại nội dung">
        {kinds.map(({ id, title, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={tab === id} className={tab === id ? "active" : ""}
            onClick={() => switchTab(id)}><Icon size={17} /> {title} <span>{data[plural[id]].length}</span></button>
        ))}
      </div>
      <div className="admin-content-toolbar">
        <label className="admin-search-input"><Search size={18} aria-hidden="true" />
          <input type="search" aria-label={"Tìm " + labels[tab]} placeholder={"Tìm " + labels[tab] + "…"}
            value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        {tab === "album" && <label className="admin-archive-toggle">
          <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
          Cả album lưu trữ
        </label>}
        <button type="button" className="primary admin-add-button" onClick={() => openEditor(null)}>
          <Plus size={17} /> Thêm {labels[tab]}
        </button>
      </div>
      {loading ? <div className="admin-empty"><p>Đang tải dữ liệu…</p></div> :
        rows.length ? <div className="admin-content-list">{rows.map((row) => (
          <article className="admin-content-row" key={row.id}>
            <div className="admin-content-row-info">
              <strong>{row.title}</strong>
              <small>{row.event_date || row.visited_on || "Chưa có ngày"}
                {tab === "album" ? " · " + (row.photo_count || 0) + " ảnh" : ""}
                {row.archived_at ? " · Đã lưu trữ" : ""}
              </small>
            </div>
            <div className="admin-content-actions">
              {!row.archived_at && <button type="button" className="secondary" onClick={() => openEditor(row)}><Pencil size={15} /> Sửa</button>}
              {row.archived_at
                ? <button type="button" className="secondary" disabled={busy} onClick={() => void restore(row)}><RotateCcw size={15} /> Khôi phục</button>
                : <button type="button" className="secondary" disabled={busy} onClick={() => void remove(row)}>
                  {tab === "album" ? <Archive size={15} /> : <Trash2 size={15} />}
                  {tab === "album" ? "Lưu trữ" : "Xóa"}
                </button>}
            </div>
          </article>
        ))}</div> : <div className="admin-empty"><Album size={28} /><h3>Chưa có {labels[tab]}</h3><p>Chọn thêm mới để lưu lại kỷ niệm đầu tiên.</p></div>}
      {editing && <form className="admin-content-editor" onSubmit={(event) => void submit(event)}>
        <div className="admin-section-heading">
          <h3>{item ? "Sửa " : "Thêm "}{labels[tab]}</h3>
          <button type="button" className="admin-icon-action" onClick={closeEditor} aria-label="Đóng biểu mẫu"><X size={18} /></button>
        </div>
        <label className="field">Tên <input required maxLength={150} value={values.title} onChange={(event) => set("title", event.target.value)} /></label>
        {tab === "album" && <>
          <label className="field">Ngày kỷ niệm <input type="date" value={values.event_date} onChange={(event) => set("event_date", event.target.value)} /></label>
          <label className="field">Mô tả <textarea maxLength={2000} value={values.description} onChange={(event) => set("description", event.target.value)} /></label>
        </>}
        {tab === "place" && <>
          <div className="admin-editor-grid">
            <label className="field">Vĩ độ <input required type="number" min="-90" max="90" step="any" value={values.latitude} onChange={(event) => set("latitude", event.target.value)} /></label>
            <label className="field">Kinh độ <input required type="number" min="-180" max="180" step="any" value={values.longitude} onChange={(event) => set("longitude", event.target.value)} /></label>
          </div>
          <label className="field">Ngày ghé thăm <input type="date" value={values.visited_on} onChange={(event) => set("visited_on", event.target.value)} /></label>
        </>}
        {tab === "milestone" && <>
          <label className="field">Ngày tháng <input type="date" required value={values.event_date} onChange={(event) => set("event_date", event.target.value)} /></label>
          <label className="field">Câu chuyện <textarea maxLength={4000} value={values.details} onChange={(event) => set("details", event.target.value)} /></label>
        </>}
        {tab !== "album" && <label className="field">Album liên quan <select value={values.album_id} onChange={(event) => set("album_id", event.target.value)}>
          <option value="">Không chọn</option>{data.albums.filter((album) => !album.archived_at).map((album) =>
            <option key={album.id} value={album.id}>{album.title}</option>)}
        </select></label>}
        <div className="admin-form-buttons">
          <button type="submit" className="primary" disabled={busy}>{busy ? "Đang lưu…" : item ? "Lưu thay đổi" : "Tạo mới"}</button>
          <button type="button" className="secondary" onClick={closeEditor}>Hủy</button>
        </div>
      </form>}
      {message && <p className="status" role="status">{message}</p>}
    </section>
  );
}
