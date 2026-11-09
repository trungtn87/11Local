"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Eye, EyeOff, MapPin, Pencil, Plus, RotateCcw, Search, X } from "lucide-react";
import { ContributionPinPicker, type MemoryPin } from "@/components/contribution-pin-picker";
import { type MapCategory, type PlaceKind } from "@/lib/map-place";

type PlaceRow = {
  id: string; title: string; description: string; address: string;
  latitude: number; longitude: number; category: MapCategory; kind: PlaceKind;
  visibility: boolean; visited_on: string | null; archived_at: string | null; album_ids: string[];
};
type AlbumRow = { id: string; title: string };
type Data = { places: PlaceRow[]; albums: AlbumRow[] };
type FormValues = {
  title: string; description: string; address: string; category: MapCategory;
  kind: PlaceKind; visibility: boolean; visited_on: string; album_ids: string[];
};
const empty = (): FormValues => ({
  title: "", description: "", address: "", category: "other",
  kind: "memory", visibility: true, visited_on: "", album_ids: [],
});

export function AdminPlaceManager() {
  const [data, setData] = useState<Data>({ places: [], albums: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(false);
  const [item, setItem] = useState<PlaceRow | null>(null);
  const [values, setValues] = useState<FormValues>(empty);
  const [pin, setPin] = useState<MemoryPin | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/places", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Không tải được danh sách địa điểm");
    setData(body as Data);
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/places", { cache: "no-store" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Không tải được danh sách địa điểm");
        if (active) setData(body as Data);
      })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : "Không thể tải địa điểm"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => data.places.filter(place =>
    (showArchived || !place.archived_at) &&
    (place.title + " " + place.address).toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))
  ), [data.places, showArchived, search]);

  function closeEditor() { setEditing(false); setItem(null); setPin(null); setValues(empty()); }
  function openEditor(row: PlaceRow | null) {
    setItem(row);
    setValues(row ? {
      title: row.title, description: row.description || "", address: row.address || "",
      category: row.category, kind: "memory", visibility: row.visibility,
      visited_on: row.visited_on || "", album_ids: row.album_ids || [],
    } : empty());
    setPin(row ? { latitude: Number(row.latitude), longitude: Number(row.longitude) } : null);
    setEditing(true);
    setMessage("");
  }
  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues(previous => ({ ...previous, [key]: value }));
  }
  function toggleAlbum(id: string) {
    setValues(previous => ({
      ...previous,
      album_ids: previous.album_ids.includes(id)
        ? previous.album_ids.filter(value => value !== id)
        : [...previous.album_ids, id],
    }));
  }

  async function send(method: "POST" | "PATCH" | "DELETE", payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/places", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Không lưu được địa điểm");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pin) { setMessage("Hãy chọn vị trí bằng ghim bản đồ."); return; }
    setBusy(true); setMessage("");
    try {
      await send(item ? "PATCH" : "POST", {
        ...values, kind: "memory", latitude: pin.latitude, longitude: pin.longitude,
        visited_on: values.visited_on || null, ...(item ? { id: item.id } : {}),
      });
      await refresh();
      closeEditor();
      setMessage(item ? "Đã lưu chỉnh sửa địa điểm." : "Đã thêm địa điểm lên bản đồ.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu");
    } finally { setBusy(false); }
  }

  async function setVisible(row: PlaceRow) {
    setBusy(true); setMessage("");
    try {
      await send("PATCH", {
        title: row.title, description: row.description || "", address: row.address || "",
        latitude: Number(row.latitude), longitude: Number(row.longitude),
        category: row.category, kind: "memory", visibility: !row.visibility,
        visited_on: row.visited_on, album_ids: row.album_ids || [], id: row.id,
      });
      await refresh();
      setMessage(row.visibility ? "Địa điểm đã được ẩn trên bản đồ." : "Địa điểm đã hiện trên bản đồ.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thay đổi được trạng thái");
    } finally { setBusy(false); }
  }

  async function archive(row: PlaceRow) {
    if (!window.confirm("Lưu trữ địa điểm “" + row.title + "”? Các ảnh và album liên quan vẫn được giữ lại.")) return;
    setBusy(true); setMessage("");
    try {
      await send("DELETE", { id: row.id });
      await refresh(); closeEditor();
      setMessage("Đã lưu trữ địa điểm; không xóa kỷ niệm liên quan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu trữ");
    } finally { setBusy(false); }
  }

  async function restore(row: PlaceRow) {
    setBusy(true); setMessage("");
    try {
      await send("PATCH", { id: row.id, restore: true });
      await refresh();
      setMessage("Đã khôi phục. Địa điểm vẫn đang ẩn; bấm Hiện để công khai.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể khôi phục");
    } finally { setBusy(false); }
  }

  return <section className="admin-panel admin-places" aria-label="Quản lý địa điểm bản đồ">
    <div className="admin-section-heading">
      <div><h2>Địa điểm bản đồ</h2>
        <p>Quản lý các địa điểm kỷ niệm của gia đình, vị trí ghim và album liên quan.</p></div>
      <span className="admin-count-pill">{data.places.filter(place => !place.archived_at).length} địa điểm</span>
    </div>
    <div className="admin-content-toolbar">
      <label className="admin-search-input">
        <Search size={17} aria-hidden="true" />
        <input type="search" value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Tìm tên hoặc địa chỉ…" aria-label="Tìm địa điểm" />
      </label>
      <label className="admin-archive-toggle"><input type="checkbox" checked={showArchived}
        onChange={event => setShowArchived(event.target.checked)} /> Gồm đã lưu trữ</label>
      <button type="button" className="primary admin-add-button" onClick={() => openEditor(null)}>
        <Plus size={17} /> Thêm địa điểm
      </button>
    </div>
    {loading ? <div className="admin-empty"><p>Đang tải địa điểm…</p></div> :
      rows.length ? <div className="admin-content-list">{rows.map(row => {
        return <article key={row.id} className="admin-content-row">
          <div className="admin-content-row-info">
            <strong>🍯 {row.title}</strong>
            <small>{row.album_ids.length} album
              {row.archived_at ? " · Đã lưu trữ" : row.visibility ? " · Đang hiện" : " · Đang ẩn"}</small>
            {row.address && <small>{row.address}</small>}
          </div>
          <div className="admin-content-actions">
            {row.archived_at ? <button type="button" className="secondary" disabled={busy}
                onClick={() => void restore(row)}><RotateCcw size={15} /> Khôi phục</button> : <>
              <button type="button" className="secondary" disabled={busy}
                onClick={() => void setVisible(row)}>{row.visibility ? <EyeOff size={15} /> : <Eye size={15} />}
                {row.visibility ? "Ẩn" : "Hiện"}</button>
              <button type="button" className="secondary" onClick={() => openEditor(row)}><Pencil size={15} /> Sửa</button>
              <button type="button" className="secondary" disabled={busy}
                onClick={() => void archive(row)}><Archive size={15} /> Lưu trữ</button>
            </>}
          </div>
        </article>;
      })}</div> : <div className="admin-empty"><MapPin size={27} />
        <h3>Chưa có địa điểm phù hợp</h3><p>Thêm địa điểm mới hoặc đổi bộ lọc.</p></div>}

    {editing && <form className="admin-content-editor admin-place-editor" onSubmit={event => void submit(event)}>
      <div className="admin-section-heading"><h3>{item ? "Sửa địa điểm" : "Thêm địa điểm"}</h3>
        <button type="button" className="admin-icon-action" onClick={closeEditor} aria-label="Đóng"><X size={18} /></button></div>
      <label className="field">Tên địa điểm<input required maxLength={150} value={values.title}
        onChange={event => set("title",event.target.value)} placeholder="Ví dụ: Quán cà phê ven hồ" /></label>
      <label className="field">Địa chỉ (không bắt buộc)<input maxLength={300} value={values.address}
        onChange={event => set("address",event.target.value)} placeholder="Tên đường, khu vực…" /></label>
      <label className="field">Mô tả<input maxLength={2000} value={values.description}
        onChange={event => set("description",event.target.value)} placeholder="Điều đáng nhớ về nơi này…" /></label>
      <div className="admin-editor-grid">
        <label className="field">Ngày ghé thăm (nếu có)<input type="date" value={values.visited_on}
          onChange={event => set("visited_on",event.target.value)} /></label>
        <label className="admin-archive-toggle admin-place-visible"><input type="checkbox" checked={values.visibility}
          onChange={event => set("visibility",event.target.checked)} /> Hiển thị công khai trên bản đồ</label>
      </div>
      <div className="admin-place-picker">
        <strong>Ghim trên bản đồ</strong>
        <ContributionPinPicker key={item?.id || "new"} value={pin} onChange={setPin} />
      </div>
      <fieldset className="admin-place-albums">
        <legend>Album liên quan ({values.album_ids.length})</legend>
        <p>Chọn nhiều album nếu gia đình ghé lại địa điểm này nhiều lần. Ảnh gắn với địa điểm vẫn được giữ.</p>
        {data.albums.length ? <div className="admin-place-album-choices">
          {data.albums.map(album => <label key={album.id}>
            <input type="checkbox" checked={values.album_ids.includes(album.id)} onChange={() => toggleAlbum(album.id)}
              disabled={!values.album_ids.includes(album.id) && values.album_ids.length >= 30} />
            {album.title}
          </label>)}</div> : <p>Chưa có album nào.</p>}
      </fieldset>
      <div className="admin-form-buttons">
        <button type="submit" className="primary" disabled={busy || !pin}>
          {busy ? "Đang lưu…" : item ? "Lưu thay đổi" : "Thêm lên bản đồ"}</button>
        <button type="button" className="secondary" onClick={closeEditor}>Hủy</button>
      </div>
    </form>}
    {message && <p role="status" className="status admin-toast">{message}</p>}
  </section>;
}
