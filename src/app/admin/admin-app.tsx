"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import { CheckCircle2, Clock3, MapPin, MapPinned, Plus, Save, Search, Send, Upload, XCircle } from "lucide-react";
import { LocationPicker } from "./location-picker";
import { PlaceVideoManager } from "./place-video-manager";
import { parseMapReferencePlaces } from "@/features/map/map-reference-places";
import styles from "./admin.module.css";

type Category = { id: string; name: string; icon: string | null; visibility: "visible" | "hidden"; sort_order: number };
type Field = { category_id: string; field_key: string; label: string; field_type: string;
  help_text: string | null; options: string[]; is_required: boolean; sort_order: number };
type PlaceKind = "business" | "attraction" | "public_place";
type Place = { id: string; slug: string; name: string; category_id: string; place_kind: PlaceKind;
  summary: string; description: string; address: string; area: string;
  latitude: number; longitude: number; phone: string | null; website_url: string | null; facebook_url: string | null; youtube_url: string | null;
  opening_hours: string | null; price_note: string | null; featured_rank: number | null;
  moderation_status: "pending" | "approved" | "rejected"; visibility: "visible" | "hidden"; photo_count: number;
  rejection_reason: string | null;
  version: number; details: Record<string, unknown> };
type Photo = { id: string; photo_type: string; moderation_status: string; created_at: string };
type FormState = { name: string; slug: string; categoryId: string; placeKind: PlaceKind;
  summary: string; description: string; address: string; area: string;
  latitude: number; longitude: number; phone: string; websiteUrl: string; facebookUrl: string; youtubeUrl: string;
  openingHours: string; priceNote: string; featuredRank: number | null;
  visibility: "visible" | "hidden"; details: Record<string, unknown> };
const blank = (): FormState => ({ name: "", slug: "", categoryId: "", placeKind: "business",
  summary: "", description: "", address: "", area: "Cao Bằng",
  latitude: 22.6666, longitude: 106.258, phone: "", websiteUrl: "", facebookUrl: "", youtubeUrl: "",
  openingHours: "", priceNote: "", featuredRank: null, visibility: "visible", details: {} });

const kindLabels: Record<PlaceKind, string> = {
  business: "Cơ sở kinh doanh", attraction: "Điểm tham quan", public_place: "Địa điểm công cộng",
};
const describeError = (code: string) => {
  if (code === "POSSIBLE_DUPLICATE") return "Địa điểm có thể bị trùng tên hoặc ghim gần địa điểm đã có.";
  if (code === "STALE_VERSION") return "Dữ liệu đã thay đổi ở một phiên khác. Hãy tải lại địa điểm trước khi sửa.";
  if (code === "ALREADY_REVIEWED") return "Địa điểm không còn ở trạng thái chờ duyệt. Hãy tải lại danh sách.";
  if (code === "REASON_REQUIRED") return "Cần nhập lý do từ chối tối thiểu 5 ký tự.";
  if (code === "REASON_TOO_LONG") return "Lý do từ chối tối đa 500 ký tự.";
  if (code === "INVALID_VERSION") return "Không xác định được phiên bản địa điểm. Hãy tải lại danh sách.";
  if (code === "SLUG_EXISTS") return "Đường dẫn này đã được dùng. Hãy đổi slug.";
  if (code === "INVALID_CATEGORY") return "Danh mục không còn hợp lệ. Hãy tải lại danh mục.";
  if (code.startsWith("REQUIRED_DETAIL_FIELD:")) return "Thiếu trường bắt buộc: " + code.split(":")[1];
  if (code.startsWith("INVALID_DETAIL_FIELD:")) return "Thông tin không hợp lệ: " + code.split(":")[1];
  return "Không lưu được dữ liệu: " + (code || "Vui lòng thử lại.");
};

function DetailField({ field, value, onChange }: {
  field: Field; value: unknown; onChange: (v: unknown) => void;
}) {
  const label = field.label + (field.is_required ? " *" : "");
  const options = Array.isArray(field.options) ? field.options : [];
  const help = field.help_text ? <small className={styles.fieldHint}>{field.help_text}</small> : null;

  if (field.field_type === "boolean") {
    return <label>{label}<select value={typeof value === "boolean" ? String(value) : ""}
      required={field.is_required}
      onChange={e => onChange(e.target.value === "" ? undefined : e.target.value === "true")}>
      <option value="">Chưa xác định</option><option value="true">Có</option><option value="false">Không</option>
    </select>{help}</label>;
  }
  if (field.field_type === "multi_select") {
    const checked = Array.isArray(value) ? value as string[] : [];
    return <div className={styles.fieldGroup}><strong>{label}</strong>
      <div className={styles.optionGrid}>
        {options.map(option => <label key={option} className={styles.checkOption}>
          <input type="checkbox" checked={checked.includes(option)}
            onChange={e => onChange(e.target.checked
              ? [...checked, option] : checked.filter(item => item !== option))} />
          <span>{option}</span>
        </label>)}
      </div>{help}
    </div>;
  }
  if (field.field_type === "select") {
    return <label>{label}<select required={field.is_required} value={typeof value === "string" ? value : ""}
      onChange={e => onChange(e.target.value || undefined)}>
      <option value="">Chưa chọn</option>{options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>{help}</label>;
  }
  if (field.field_type === "long_text") {
    return <label className={styles.wide}>{label}
      <textarea rows={3} maxLength={5000} required={field.is_required}
        value={typeof value === "string" ? value : ""} onChange={e => onChange(e.target.value || undefined)} />
      {help}</label>;
  }
  if (field.field_type === "number") {
    return <label>{label}<input type="number" step="any" required={field.is_required}
      value={typeof value === "number" ? value : ""}
      onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
      {help}</label>;
  }
  return <label>{label}<input
    type={field.field_type === "url" ? "url" : "text"}
    maxLength={500} required={field.is_required}
    value={typeof value === "string" ? value : ""}
    onChange={e => onChange(e.target.value || undefined)} />{help}</label>;
}

export default function AdminApp() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [pinSelected, setPinSelected] = useState(false);
  const [coordinateDraftPending, setCoordinateDraftPending] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [catalogError, setCatalogError] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeFilter, setPlaceFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const loadPlaces = useCallback(async () => {
    const res = await fetch("/api/admin/places", { cache: "no-store" });
    if (res.status === 401) { setAuth(false); return; }
    if (!res.ok) throw new Error("Không tải được địa điểm");
    const body = await res.json();
    setPlaces(body.places || []);
    setAuth(true);
  }, []);
  const loadCatalog = useCallback(async () => {
    const res = await fetch("/api/admin/place-schema", { cache: "no-store" });
    if (!res.ok) { setCatalogError(true); throw new Error("Không tải được danh mục"); }
    const body = await res.json();
    const data: Category[] = body.categories || [];
    setCategories(data);
    setFields(body.fields || []);
    setCatalogError(false);
    setForm(current => current.categoryId ? current : { ...current,
      categoryId: data[0]?.id || "", placeKind: data[0]?.id === "sight" ? "attraction" : "business" });
  }, []);
  const loadPhotos = useCallback(async (id: string) => {
    const res = await fetch("/api/admin/places/" + id + "/photos", { cache: "no-store" });
    if (res.ok) { const body = await res.json(); setPhotos(body.photos || []); }
    else setPhotos([]);
  }, []);

  useEffect(() => {
    fetch("/api/admin/session").then(r => r.json()).then(async body => {
      setAuth(Boolean(body.authenticated));
      if (body.authenticated) await Promise.all([loadPlaces(), loadCatalog()]);
    }).catch(() => { setMessage("Không thể tải trang Admin."); setAuth(false); });
  }, [loadPlaces, loadCatalog]);

  const pick = (p: Place | null) => {
    setSelected(p); setPhotos([]); setMessage(""); setPinSelected(Boolean(p));
    setRejectOpen(false); setRejectReason("");
    setCoordinateDraftPending(false);
    if (p) {
      setForm({ name: p.name, slug: p.slug, categoryId: p.category_id,
        placeKind: p.place_kind, summary: p.summary || "", description: p.description || "",
        address: p.address, area: p.area, latitude: Number(p.latitude), longitude: Number(p.longitude),
        phone: p.phone || "", websiteUrl: p.website_url || "", facebookUrl: p.facebook_url || "", youtubeUrl: p.youtube_url || "",
        openingHours: p.opening_hours || "", priceNote: p.price_note || "",
        featuredRank: p.featured_rank == null ? null : Number(p.featured_rank),
        visibility: p.visibility, details: p.details || {} });
      void loadPhotos(p.id);
    } else {
      setForm({ ...blank(), categoryId: categories[0]?.id || "",
        placeKind: categories[0]?.id === "sight" ? "attraction" : "business" });
    }
  };
  const updateDetail = (key: string, value: unknown) => {
    setForm(current => ({ ...current,
      details: { ...current.details, [key]: value },
    }));
  };
  const selectedFields = fields.filter(field => field.category_id === form.categoryId);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!categories.length || catalogError) { setMessage("Chưa tải được danh mục từ Neon."); return; }
    if (coordinateDraftPending) { setMessage("Bạn đã sửa tọa độ. Hãy bấm Đặt ghim theo tọa độ trước khi lưu."); return; }
    if (!pinSelected) { setMessage("Hãy kéo ghim trên bản đồ hoặc nhập tọa độ rồi bấm Đặt ghim trước khi lưu."); return; }
    setBusy(true); setMessage("");
    try {
      const payload = { ...form,
        // Do not submit old hidden/removed/category-specific values from another schema.
        details: Object.fromEntries(selectedFields
          .filter(field => form.details[field.field_key] !== undefined)
          .map(field => [field.field_key, form.details[field.field_key]])),
        expectedVersion: selected?.version ?? undefined,
      };
      const res = await fetch(selected ? "/api/admin/places/" + selected.id : "/api/admin/places", {
        method: selected ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) { setMessage(describeError(body.error)); return; }
      await loadPlaces();
      pick(body.place);
      setMessage(selected ? "Đã lưu thay đổi địa điểm." : "Đã tạo địa điểm ở trạng thái chờ duyệt.");
    } catch {
      setMessage("Không thể kết nối để lưu địa điểm.");
    } finally { setBusy(false); }
  };
  const publish = async () => {
    if (!selected || !confirm("Công khai địa điểm này trên website?")) return;
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/places/" + selected.id + "/publish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: selected.version }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "PUBLISH_FAILED");
      const body = await res.json();
      await loadPlaces();
      pick({ ...selected, ...body.place, details: form.details });
      setMessage("Địa điểm đã được công khai.");
    } catch (error) {
      setMessage(describeError(error instanceof Error ? error.message : "PUBLISH_FAILED"));
    } finally { setBusy(false); }
  };
  const reject = async () => {
    if (!selected || selected.moderation_status !== "pending" || busy) return;
    const reason = rejectReason.trim();
    if (reason.length < 5) { setMessage("Cần nhập lý do từ chối tối thiểu 5 ký tự."); return; }
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/places/" + selected.id + "/reject", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, expectedVersion: selected.version }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "REJECT_FAILED");
      await loadPlaces();
      pick({ ...selected, ...body.place, details: form.details, rejection_reason: reason });
      setMessage("Đã từ chối địa điểm. Lý do đã được lưu trong lịch sử kiểm duyệt.");
    } catch (error) {
      setMessage(describeError(error instanceof Error ? error.message : "REJECT_FAILED"));
    } finally { setBusy(false); }
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!selected || !file) return;
    setBusy(true);
    try {
      const data = new FormData(); data.set("file", file);
      const res = await fetch("/api/admin/places/" + selected.id + "/photos", { method: "POST", body: data });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "UPLOAD_FAILED");
      await Promise.all([loadPhotos(selected.id), loadPlaces()]);
      event.target.value = "";
      setMessage("Đã tải và tối ưu ảnh (" + Math.round(body.photo.bytes / 1024) + " KiB).");
    } catch { setMessage("Tải ảnh thất bại. Vui lòng thử lại."); }
    finally { setBusy(false); }
  };
  const chooseCover = async (id: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/photos/" + id, { method: "PATCH" });
      if (!res.ok) throw new Error("SELECT_COVER_FAILED");
      await Promise.all([loadPhotos(selected.id), loadPlaces()]);
      setMessage("Đã chọn ảnh đại diện.");
    } catch { setMessage("Không thể chọn ảnh đại diện."); }
    finally { setBusy(false); }
  };
  const login = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const res = await fetch("/api/admin/session", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!res.ok) { setMessage("Mật khẩu không đúng."); return; }
      setPassword(""); setAuth(true); setMessage("");
      window.dispatchEvent(new Event("11local-admin-auth-changed"));
      await Promise.all([loadCatalog(), loadPlaces()]);
    } catch { setMessage("Không kết nối được Admin."); }
    finally { setBusy(false); }
  };
  const categoryName = (id: string) => categories.find(item => item.id === id)?.name || id;
  // Admin needs every stored place, including pending/hidden records. Do not
  // use the public API here: its moderation gate intentionally excludes them.
  const adminMapPlaces = useMemo(() => {
    const byId = new Map(categories.map(category => [category.id, category]));
    return parseMapReferencePlaces({ places: places.map(place => ({
      ...place,
      category_name: byId.get(place.category_id)?.name || place.category_id,
      category_icon: byId.get(place.category_id)?.icon ?? null,
    })) });
  }, [places, categories]);
  const pendingCount = places.filter(p => p.moderation_status === "pending").length;
  const approvedCount = places.filter(p => p.moderation_status === "approved").length;
  const filteredPlaces = places.filter(p => {
    if (placeFilter !== "all" && p.moderation_status !== placeFilter) return false;
    const query = placeQuery.trim().toLocaleLowerCase("vi-VN");
    return !query || [p.name, p.area, p.address, categoryName(p.category_id)]
      .some(value => value.toLocaleLowerCase("vi-VN").includes(query));
  });

  if (auth === null) return <main className={styles.center}>Đang kiểm tra phiên Admin…</main>;
  if (!auth) return <main className={styles.center}>
    <form className={styles.login} onSubmit={login}>
      <h1>Nhà của Gấu — Admin</h1><p>Đăng nhập quản trị album & kỷ niệm gia đình</p>
      <input type="password" autoFocus required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu Admin" />
      <button disabled={busy}>Đăng nhập</button>{message && <p className={styles.error}>{message}</p>}
    </form>
  </main>;

  return <main className={styles.shell}>
    <header className={styles.pageHeader}>
      <div>
        <span className={styles.eyebrow}>QUẢN LÝ NỘI DUNG</span>
        <h1>Album & Địa điểm</h1>
        <p>Quản lý thông tin, vị trí và hình ảnh của các địa điểm trên 11Local.</p>
      </div>
      <span className={styles.sourceBadge}><span/> Dữ liệu Neon</span>
    </header>
    <div className={styles.stats} aria-label="Thống kê địa điểm">
      <div className={styles.statCard}>
        <span className={styles.statIcon}><MapPinned size={20} aria-hidden="true"/></span>
        <div><small>Tổng địa điểm</small><strong>{places.length}</strong><span>Trong hệ thống</span></div>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statIcon}><Clock3 size={20} aria-hidden="true"/></span>
        <div><small>Chờ duyệt</small><strong>{pendingCount}</strong><span>Cần xử lý</span></div>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statIcon}><CheckCircle2 size={20} aria-hidden="true"/></span>
        <div><small>Đã duyệt</small><strong>{approvedCount}</strong><span>Đã kiểm duyệt</span></div>
      </div>
    </div>
    <div className={styles.grid}>
      <aside className={styles.placeSidebar}>
        <div className={styles.placeSidebarHeader}>
          <div><h2>Danh sách địa điểm</h2><span>{filteredPlaces.length} / {places.length} địa điểm</span></div>
          <button type="button" className={styles.addSmall} aria-label="Thêm địa điểm" title="Thêm địa điểm" onClick={() => pick(null)}><Plus size={19}/></button>
        </div>
        <label className={styles.searchBox}>
          <Search size={17} aria-hidden="true"/>
          <input type="search" value={placeQuery} onChange={e => setPlaceQuery(e.target.value)}
            placeholder="Tìm tên, địa chỉ…" aria-label="Tìm địa điểm"/>
        </label>
        <div className={styles.filterTabs} role="group" aria-label="Lọc địa điểm theo trạng thái">
          {([["all", "Tất cả"], ["pending", "Chờ duyệt"], ["approved", "Đã duyệt"], ["rejected", "Từ chối"]] as const)
            .map(([value, label]) => <button key={value} type="button"
              aria-pressed={placeFilter === value} onClick={() => setPlaceFilter(value)}>{label}</button>)}
        </div>
        <div className={styles.list}>
          {filteredPlaces.length ? filteredPlaces.map(p => <button key={p.id} type="button"
            aria-pressed={selected?.id === p.id} className={selected?.id === p.id ? styles.active : ""}
            onClick={() => pick(p)}>
            <span className={styles.placeName}>{p.name}</span>
            <span className={styles.placeMeta}><MapPin size={12} aria-hidden="true"/>{categoryName(p.category_id)} · {p.area}</span>
            <em data-status={p.moderation_status}>
              {p.moderation_status === "approved" ? "Đã duyệt" : p.moderation_status === "rejected" ? "Đã từ chối" : "Chờ duyệt"}
            </em>
          </button>) : <p className={styles.emptyList}>Không tìm thấy địa điểm phù hợp.</p>}
        </div>
        <button type="button" className={styles.new} onClick={() => pick(null)}><Plus size={17}/>Thêm địa điểm mới</button>
      </aside>
      <section className={styles.editorPanel}>
        <form onSubmit={save}>
          <div className={styles.title}><div>
            <span className={styles.editorEyebrow}>{selected ? "CHỈNH SỬA" : "TẠO MỚI"}</span>
            <h2>{selected ? selected.name : "Thêm địa điểm"}</h2>
            <p>{selected ? "Cập nhật thông tin và quản lý hình ảnh địa điểm." : "Địa điểm mới được lưu ở trạng thái chờ duyệt."}</p>
          </div>{selected?.moderation_status === "pending" && <div className={styles.titleActions}>
            <button className={styles.rejectButton} type="button" disabled={busy}
              onClick={() => { setRejectOpen(current => !current); setMessage(""); }}>
              <XCircle size={16}/>Từ chối</button>
            <button className={styles.publish} type="button" disabled={busy} onClick={publish}>
              <Send size={16}/>Công khai</button>
          </div>}</div>
          {message && <div className={styles.notice} role="status">{message}</div>}
          {selected?.moderation_status === "rejected" && <div className={styles.rejectionInfo}>
            <strong>Địa điểm đã bị từ chối</strong>
            <p>{selected.rejection_reason || "Chưa có lý do từ chối được lưu."}</p>
          </div>}
          {selected?.moderation_status === "pending" && rejectOpen && <section className={styles.rejectPanel} aria-label="Xác nhận từ chối địa điểm">
            <h3>Từ chối địa điểm này?</h3>
            <p>Địa điểm sẽ không công khai trên website. Vui lòng ghi lý do để lưu lịch sử xử lý.</p>
            <label htmlFor="place-rejection-reason">Lý do từ chối *</label>
            <textarea id="place-rejection-reason" rows={3} minLength={5} maxLength={500}
              placeholder="Ví dụ: Địa điểm đã tồn tại hoặc thông tin không chính xác."
              value={rejectReason} onChange={event => setRejectReason(event.target.value)}/>
            <div className={styles.rejectActions}>
              <button type="button" disabled={busy} onClick={() => setRejectOpen(false)}>Hủy</button>
              <button type="button" disabled={busy || rejectReason.trim().length < 5} onClick={() => void reject()}>
                <XCircle size={16}/>{busy ? "Đang từ chối…" : "Xác nhận từ chối"}
              </button>
            </div>
          </section>}
          {catalogError && <div className={styles.notice}>Không tải được danh mục. <button type="button" onClick={() => void loadCatalog()}>Thử lại</button></div>}
          <h3 className={styles.sectionTitle}>Thông tin chung</h3>
          <div className={styles.fields}>
            <label>Tên địa điểm *<input required maxLength={160} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
            <label>Đường dẫn (slug)<input maxLength={128} value={form.slug} placeholder="Tự tạo theo tên" onChange={e => setForm({ ...form, slug: e.target.value })}/></label>
            <label>Danh mục *<select required value={form.categoryId} onChange={e => {
              const categoryId = e.target.value;
              setForm(current => ({ ...current, categoryId,
                placeKind: categoryId === "sight" ? "attraction" : "business", details: {} }));
            }} disabled={!categories.length}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.visibility === "hidden" ? " (đang ẩn)" : ""}</option>)}
            </select></label>
            <label>Loại địa điểm<select value={form.placeKind} onChange={e => setForm({ ...form, placeKind: e.target.value as PlaceKind })}>
              {Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></label>
            <label className={styles.wide}>Giới thiệu ngắn (trên thẻ)<textarea rows={2} maxLength={350} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })}/></label>
            <label className={styles.wide}>Giới thiệu chi tiết<textarea rows={5} maxLength={5000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label>
            <label>Khu vực *<input required maxLength={120} value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}/></label>
            <label>Điện thoại<input maxLength={40} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label>
            <label className={styles.wide}>Địa chỉ *<input required maxLength={500} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}/></label>
            <label className={styles.wide}>Website (nếu có)<input type="url" maxLength={500} value={form.websiteUrl} placeholder="https://" onChange={e => setForm({ ...form, websiteUrl: e.target.value })}/></label>
            <label>Facebook (nếu có)<input type="url" maxLength={500} value={form.facebookUrl} placeholder="https://facebook.com/..." onChange={e => setForm({ ...form, facebookUrl: e.target.value })}/></label>
            <label>YouTube (nếu có)<input type="url" maxLength={500} value={form.youtubeUrl} placeholder="https://youtube.com/..." onChange={e => setForm({ ...form, youtubeUrl: e.target.value })}/></label>
            <label>Giờ hoạt động (mô tả)<input maxLength={500} value={form.openingHours} placeholder="VD: 07:00–17:00" onChange={e => setForm({ ...form, openingHours: e.target.value })}/></label>
            <label>Giá tham khảo<input maxLength={300} value={form.priceNote} placeholder="VD: 20.000đ/vé" onChange={e => setForm({ ...form, priceNote: e.target.value })}/></label>
            <label>Trạng thái hiển thị<select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value as FormState["visibility"] })}>
              <option value="visible">Hiện sau khi duyệt</option><option value="hidden">Ẩn khỏi website</option>
            </select></label>
            <label>Ưu tiên nổi bật (tùy chọn)<input type="number" min={1} max={10000} value={form.featuredRank ?? ""}
              placeholder="Chưa xếp hạng" onChange={e => setForm({ ...form, featuredRank: e.target.value ? Number(e.target.value) : null })}/>
              <small className={styles.fieldHint}>Lưu thứ tự nổi bật để dùng ở trang Khám phá sau này.</small>
            </label>
          </div>
          {selectedFields.length > 0 && <>
            <h3 className={styles.sectionTitle}>Thông tin riêng · {categoryName(form.categoryId)}</h3>
            <p className={styles.sectionHelp}>Các trường được quản lý trong database theo từng danh mục.</p>
            <div className={styles.fields}>
              {selectedFields.map(field => <DetailField key={field.field_key} field={field}
                value={form.details[field.field_key]} onChange={value => updateDetail(field.field_key, value)}/>)}
            </div>
          </>}
          {selected && <>
            <h3 className={styles.sectionTitle}>Thông tin kèm theo</h3>
            <PlaceVideoManager key={selected.id} placeId={selected.id} />
          </>}
          <h3 className={styles.sectionTitle}><MapPin size={18}/> Vị trí trên bản đồ</h3>
          {!pinSelected && <p className={styles.pinNotice}>Hãy kéo trực tiếp ghim hoặc nhập tọa độ thủ công rồi bấm Đặt ghim trước khi lưu.</p>}
          <LocationPicker key={selected?.id ?? "new"} latitude={form.latitude} longitude={form.longitude}
            referencePlaces={adminMapPlaces}
            onPendingChange={setCoordinateDraftPending}
            onChange={(longitude, latitude) => {
              setPinSelected(true);
              setCoordinateDraftPending(false);
              setForm(current => ({ ...current, latitude, longitude }));
            }}/>
          {selected && <div className={styles.photosSection}>
            <h3>Ảnh địa điểm</h3>
            <p>Chọn ảnh đại diện dùng cho thẻ địa điểm, bản đồ và trang chi tiết. Ảnh khác nằm trong thư viện.</p>
            <label className={styles.upload}><Upload size={17}/>Thêm ảnh (tối đa 10 MB; tự tối ưu WebP)
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={upload} disabled={busy}/>
              <span>{photos.length} ảnh</span></label>
            {photos.length ? <div className={styles.photoGrid}>
              {photos.map(photo => <div key={photo.id} className={styles.photoTile} data-cover={photo.photo_type === "cover"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={"/api/admin/photos/" + photo.id} alt={"Ảnh " + selected.name} loading="lazy"/>
                <button type="button" disabled={busy || photo.photo_type === "cover"} onClick={() => void chooseCover(photo.id)}>
                  {photo.photo_type === "cover" ? "Ảnh đại diện ✓" : "Chọn làm ảnh đại diện"}
                </button>
              </div>)}
            </div> : <p>Chưa có ảnh. Ảnh đầu tiên tải lên sẽ được chọn làm đại diện.</p>}
          </div>}
          <div className={styles.saveBar}>
            <span>Kiểm tra thông tin và vị trí ghim trước khi lưu.</span>
            <button className={styles.save} disabled={busy || !categories.length || catalogError}>
              <Save size={17}/>{busy ? "Đang lưu…" : selected ? "Lưu thay đổi" : "Lưu địa điểm mới"}
            </button>
          </div>
        </form>
      </section>
    </div>
  </main>;
}
