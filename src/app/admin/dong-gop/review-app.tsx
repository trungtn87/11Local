"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Check, CheckCircle2, ChevronRight, Clock3,
  ExternalLink, MapPin, RefreshCw, Save, ShieldCheck, XCircle } from "lucide-react";
import { LocationPicker } from "@/app/admin/location-picker";
import type { ReviewPlace } from "@/lib/contribution-review";
import styles from "./review.module.css";
import ExistingReview from "./existing-review";

type Status = "pending" | "needs_info" | "approved" | "rejected";
type Filter = Status | "all";
type ListItem = {
  id: string; tracking_code: string; moderation_status: Status; kind: string;
  name: string; area: string; category_id: string; created_at: string;
  updated_at: string; photo_count: number; version: number; place_id: string | null;
};
type Contribution = {
  id: string; tracking_code: string; moderation_status: Status; kind: string;
  payload: Record<string, unknown>; contact_phone: string | null;
  created_at: string; updated_at: string; decision_note: string | null;
  reviewed_at: string | null; version: number; place_id: string | null;
};
type Photo = { id: string; sort_order: number; is_cover: boolean; published: boolean };
type Category = { id: string; name: string; visibility: "visible" | "hidden" };
type CategoryField = {
  category_id: string; field_key: string; field_type: string; label: string;
  options: string[]; is_required: boolean; help_text: string | null;
};
type Nearby = { id: string; slug: string; name: string; distanceMeters: number };
type Detail = { contribution: Contribution; photos: Photo[]; categories: Category[];
  fields: CategoryField[]; nearby: Nearby[]; publishedPlace: { slug: string; name: string } | null;
   existingPlace: Record<string,unknown> | null;
   messages: {sender:string;body:string;created_at:string}[] };

const kindLabels:Record<string,string>={new_place:"Địa điểm mới",report:"Báo sai",edit_place:"Đề xuất sửa",photo:"Gửi ảnh"};
const statuses: { value: Filter; label: string }[] = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "needs_info", label: "Cần bổ sung" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
  { value: "all", label: "Tất cả" },
];
const errors: Record<string, string> = {
  STALE_VERSION: "Đóng góp đã được thay đổi ở một phiên khác. Hãy tải lại.",
  ALREADY_REVIEWED: "Đóng góp đã được xử lý, không thể duyệt lần hai.",
  POSSIBLE_DUPLICATE: "Phát hiện địa điểm trùng sau khi kiểm tra lần cuối. Hãy kiểm tra, ghi lý do và bật cho phép trùng.",
  DUPLICATE_REASON_REQUIRED: "Để duyệt địa điểm nghi trùng, bắt buộc ghi lý do tối thiểu 10 ký tự.",
  REASON_REQUIRED: "Hãy nhập lý do ít nhất 5 ký tự.",
  INVALID_CATEGORY: "Danh mục bị ẩn hoặc không còn tồn tại. Hãy chọn danh mục công khai.",
  INVALID_PHOTO_SELECTION: "Có ảnh không thuộc đóng góp này. Hãy tải lại.",
  COVER_NOT_SELECTED: "Ảnh bìa phải nằm trong nhóm ảnh đã chọn.",
  INVALID_WEBSITE_URL: "Đường dẫn website không hợp lệ.",
  INVALID_FACEBOOK_URL: "Liên kết Facebook không hợp lệ.",
  INVALID_YOUTUBE_URL: "Liên kết YouTube không hợp lệ.",
  REVIEW_FAILED: "Không thể hoàn tất kiểm duyệt. Không có thay đổi nào được công khai.",
  COORDINATES_REQUIRED: "Địa điểm nghiên cứu chưa có ghim được lưu và xác nhận. Hãy kéo ghim tới đúng vị trí, lưu chỉnh sửa rồi mới duyệt.",
  SAVE_FAILED: "Không thể lưu bản chỉnh sửa.",
  UNAUTHORIZED: "Phiên quản trị đã hết hạn.",
};
const describe = (code: string) => errors[code] ||
  (code.startsWith("REQUIRED_DETAIL_FIELD:") ? "Chưa nhập trường bắt buộc: " + code.split(":")[1] :
    code.startsWith("INVALID_DETAIL_FIELD:") ? "Trường chưa hợp lệ: " + code.split(":")[1] :
      "Thao tác thất bại: " + code);
const asText = (value: unknown) => typeof value === "string" ? value : "";
const asNumber = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
function normalizeDraft(data: Record<string, unknown>): ReviewPlace {
  const categoryId = asText(data.categoryId);
  const rawDetails = data.details;
  return {
    name: asText(data.name), categoryId, address: asText(data.address),
    area: asText(data.area), latitude: asNumber(data.latitude, 22.6666),
    longitude: asNumber(data.longitude, 106.2588),
    description: asText(data.description), phone: asText(data.phone),
    openingHours: asText(data.openingHours), summary: asText(data.summary),
    websiteUrl: asText(data.websiteUrl), facebookUrl: asText(data.facebookUrl),
    youtubeUrl: asText(data.youtubeUrl), priceNote: asText(data.priceNote),
    placeKind: data.placeKind === "attraction" || data.placeKind === "public_place"
      ? data.placeKind : categoryId === "sight" ? "attraction" : "business",
    details: rawDetails && typeof rawDetails === "object" && !Array.isArray(rawDetails)
      ? rawDetails as Record<string, unknown> : {},
  };
}
const stamp = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

function DynamicField({ field, value, onChange, disabled = false }: { field: CategoryField;
  value: unknown; onChange: (next: unknown) => void; disabled?: boolean }) {
  const label = field.label + (field.is_required ? " *" : "");
  const options = Array.isArray(field.options) ? field.options : [];
  const hint = field.help_text ? <small className={styles.hint}>{field.help_text}</small> : null;
  if (field.field_type === "boolean") return <label className={styles.field}>{label}
    <select disabled={disabled} value={typeof value === "boolean" ? String(value) : ""}
      onChange={e => onChange(e.target.value === "" ? undefined : e.target.value === "true")}>
      <option value="">Chưa rõ</option><option value="true">Có</option><option value="false">Không</option>
    </select>{hint}</label>;
  if (field.field_type === "select") return <label className={styles.field}>{label}
    <select disabled={disabled} value={asText(value)} onChange={e => onChange(e.target.value || undefined)}>
      <option value="">Chưa chọn</option>{options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>{hint}</label>;
  if (field.field_type === "multi_select") {
    const selected = Array.isArray(value) ? value as string[] : [];
    return <div className={styles.field}><strong>{label}</strong>
      <div className={styles.checks}>{options.map(o => <label key={o}><input type="checkbox" disabled={disabled}
        checked={selected.includes(o)} onChange={e => onChange(e.target.checked
          ? [...selected, o] : selected.filter(v => v !== o))}/>{o}</label>)}</div>{hint}
    </div>;
  }
  if (field.field_type === "long_text") return <label className={styles.field}>{label}
    <textarea disabled={disabled} maxLength={5000} rows={3} value={asText(value)}
      onChange={e => onChange(e.target.value || undefined)}/>{hint}</label>;
  if (field.field_type === "number") return <label className={styles.field}>{label}
    <input type="number" disabled={disabled} step="any" value={typeof value === "number" ? value : ""}
      onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))}/>{hint}</label>;
  return <label className={styles.field}>{label}
    <input disabled={disabled} type={field.field_type === "url" ? "url" : "text"} maxLength={500}
      value={asText(value)} onChange={e => onChange(e.target.value || undefined)}/>{hint}</label>;
}

export default function ReviewApp() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<ListItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [draft, setDraft] = useState<ReviewPlace | null>(null);
  const [dirty, setDirty] = useState(false);
  const [coordinatePicked, setCoordinatePicked] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [included, setIncluded] = useState<string[]>([]);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [listBusy, setListBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ status: string; place?: { slug: string; name: string } | null } | null>(null);

  const loadList = useCallback(async (active: Filter) => {
    setListBusy(true);
    try {
      const res = await fetch("/api/admin/contributions?status=" + active, { cache: "no-store" });
      if (res.status === 401) { setAuth(false); return; }
      if (!res.ok) throw new Error("QUEUE_UNAVAILABLE");
      const result = await res.json();
      setRows(result.contributions || []);
      setCounts(Object.fromEntries((result.counts || []).map((row: {
        moderation_status: string; total: number }) => [row.moderation_status, Number(row.total)])));
    } catch { setError("Không tải được hàng chờ đóng góp từ Neon."); }
    finally { setListBusy(false); }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/contributions/" + id, { cache: "no-store" });
      if (res.status === 401) { setAuth(false); return; }
      if (!res.ok) throw new Error("DETAIL_UNAVAILABLE");
      const result: Detail = await res.json();
      setDetail(result);
      setDraft(normalizeDraft(result.contribution.payload));
      setDirty(false);
      setCoordinatePicked(false);
      setIncluded(result.photos.map(photo => photo.id));
      setCoverId(result.photos.find(photo => photo.is_cover)?.id ?? result.photos[0]?.id ?? null);
      setNote(result.contribution.decision_note || "");
      setAllowDuplicate(false);
    } catch { setError("Không tải được thông tin chi tiết đóng góp."); }
    finally { setDetailBusy(false); }
  }, []);
  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" }).then(res => res.json())
      .then(data => setAuth(Boolean(data.authenticated))).catch(() => setAuth(false));
  }, []);
  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) return loadList(filter); });
    return () => { cancelled = true; };
  }, [auth, filter, loadList]);
  useEffect(() => {
    if (!auth || !selectedId) return;
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) return loadDetail(selectedId); });
    return () => { cancelled = true; };
  }, [auth, selectedId, loadDetail]);
  const select = (id: string) => {
    setSelectedId(id); setOutcome(null); setDetail(null); setDraft(null);
  };
  const change = (key: keyof ReviewPlace, value: ReviewPlace[keyof ReviewPlace]) => {
    setDraft(current => current ? { ...current, [key]: value } : null);
    setDirty(true); setNotice("");
  };
  const changeCategory = (id: string) => {
    setDraft(current => current ? { ...current, categoryId: id, details: {},
      placeKind: id === "sight" ? "attraction" : "business" } : null);
    setDirty(true);
  };
  const changeExtra = (key: string, value: unknown) => {
    setDraft(current => current ? { ...current,
      details: { ...current.details, [key]: value } } : null);
    setDirty(true);
  };
  const current = detail?.contribution;
  const reviewable = current?.moderation_status === "pending" || current?.moderation_status === "needs_info";
  const selectedFields = detail?.fields.filter(f => f.category_id === draft?.categoryId) ?? [];
  const selectedCategory = detail?.categories.find(c => c.id === draft?.categoryId);
  const selectedPhotos = detail?.photos.filter(p => included.includes(p.id)) ?? [];
  const research = current?.payload?._research as Record<string, unknown> | undefined;
  const savedResearchPin = !research || (research.coordinateConfirmed === true &&
    typeof current?.payload?.latitude === "number" &&
    typeof current?.payload?.longitude === "number");
  const visibleRows = rows.filter(row => [row.name, row.area, row.tracking_code]
    .some(v => (v || "").toLocaleLowerCase("vi-VN").includes(searchText.trim().toLocaleLowerCase("vi-VN"))));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!current || !draft || !reviewable) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/contributions/" + current.id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: current.version, place: draft,
          coordinateConfirmed: coordinatePicked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "SAVE_FAILED");
      setDetail(old => old ? { ...old, contribution: data.contribution } : old);
      setDirty(false); setCoordinatePicked(false);
      setNotice("Đã lưu thông tin đã chỉnh sửa vào hàng chờ. Chưa công khai địa điểm.");
      await loadList(filter);
    } catch (e) { setError(describe((e as Error).message)); }
    finally { setBusy(false); }
  };
  const decide = async (action: "approve" | "reject" | "needs_info") => {
    if (!current || !draft || !reviewable) return;
    if (action !== "approve" && note.trim().length < 5) { setError("Hãy nhập lý do ít nhất 5 ký tự."); return; }
    if (action === "approve" && research && (!savedResearchPin || dirty)) {
      setError("Hãy đặt ghim và lưu chỉnh sửa trước khi duyệt địa điểm nghiên cứu."); return;
    }
    if (action === "approve" && selectedCategory?.visibility !== "visible") {
      setError("Danh mục đang ẩn. Hãy chuyển sang danh mục đang công khai."); return;
    }
    if (action === "approve" && !window.confirm("Duyệt và công khai địa điểm thật này trên 11Local?")) return;
    if (action !== "approve" && dirty && !window.confirm("Thông tin chưa lưu sẽ không được dùng. Tiếp tục xử lý?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/contributions/" + current.id + "/decision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: current.version, action, note,
          ...(action === "approve" ? { place: draft, approvedPhotoIds: included,
            coverPhotoId: included.includes(coverId || "") ? coverId : null, allowDuplicate } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "REVIEW_FAILED");
      setOutcome({ status: data.status, place: data.place });
      setSelectedId(null);
      setDetail(null); setDraft(null);
      setNotice(data.status === "approved" ? "Đã công khai địa điểm và các ảnh đã chọn."
        : data.status === "rejected" ? "Đã từ chối, lý do được lưu trong lịch sử."
          : "Đã ghi nhận cần bổ sung thông tin.");
      await loadList(filter);
    } catch (e) { setError(describe((e as Error).message)); }
    finally { setBusy(false); }
  };
  if (auth === null) return <main className={styles.gate}>Đang kiểm tra phiên Admin…</main>;
  if (!auth) return <main className={styles.gate}>
    <div className={styles.gateCard}>
      <ShieldCheck size={33}/><h1>Kiểm duyệt đóng góp</h1>
      <p>Chỉ Admin được xem thông tin người gửi và xử lý địa điểm.</p>
      <Link className={styles.primaryLink} href="/admin">Đăng nhập Admin <ChevronRight size={16}/></Link>
    </div>
  </main>;
  return <main className={styles.root}>
    <header className={styles.header}>
      <div><Link href="/admin" className={styles.back}><ArrowLeft size={15}/> Quản lý địa điểm</Link>
        <h1>Kiểm duyệt đóng góp</h1><p>11Local · dữ liệu đề xuất từ cộng đồng · Neon</p>
        <Link href="/admin/danh-gia" className={styles.back}>Sang kiểm duyệt đánh giá <ChevronRight size={14}/></Link></div>
      <button className={styles.refresh} onClick={() => void loadList(filter)} disabled={listBusy || busy}>
        <RefreshCw size={16}/> Làm mới</button>
    </header>
    <div className={styles.stats}>
      <div><strong>{counts.pending ?? 0}</strong><small>Chờ duyệt</small></div>
      <div><strong>{counts.needs_info ?? 0}</strong><small>Cần bổ sung</small></div>
      <div><strong>{counts.approved ?? 0}</strong><small>Đã duyệt</small></div>
      <div><strong>{counts.rejected ?? 0}</strong><small>Từ chối</small></div>
    </div>
    <div className={styles.tabs} role="group" aria-label="Lọc trạng thái">
      {statuses.map(status => <button key={status.value} type="button" onClick={() => {
        setFilter(status.value); setSelectedId(null); setDetail(null); setDraft(null); setOutcome(null);
      }} data-active={filter === status.value}>{status.label}</button>)}
    </div>
    {error && <div className={styles.alert} role="alert">{error}</div>}
    {notice && <div className={styles.notice} role="status"><CheckCircle2 size={17}/>{notice}</div>}
    {outcome?.place && <div className={styles.notice}>
      <Link href={"/dia-diem/" + outcome.place.slug} target="_blank" rel="noopener noreferrer">
        Xem địa điểm vừa duyệt: {outcome.place.name} <ExternalLink size={14}/>
      </Link></div>}
    <div className={styles.main}>
      <aside className={styles.list}>
        <h2>Đóng góp {listBusy && <span>Đang tải…</span>}</h2>
        <input type="search" aria-label="Tìm trong hàng chờ" placeholder="Tìm tên, khu vực, mã nghiên cứu…"
          value={searchText} onChange={event => setSearchText(event.target.value)}
          style={{width:"100%",padding:10,marginBottom:8,border:"1px solid #d1dbd5",borderRadius:8}} />
        {!visibleRows.length && !listBusy && <p className={styles.empty}>Không có địa điểm phù hợp.</p>}
        {visibleRows.map(row => <button key={row.id} className={styles.listItem}
          data-active={selectedId === row.id} onClick={() => select(row.id)}>
          <div className={styles.listTitle}><strong>{row.name || "(Chưa có tên)"}</strong><ChevronRight size={16}/></div>
          <span>{kindLabels[row.kind] || row.kind} · {row.tracking_code} · {row.area || "Địa điểm cũ"}</span>
          <small><Clock3 size={13}/>{stamp(row.created_at)} · {row.photo_count} ảnh</small>
          <em data-status={row.moderation_status}>{statuses.find(s => s.value === row.moderation_status)?.label}</em>
        </button>)}
      </aside>
      <section className={styles.content}>
        {!selectedId && <div className={styles.blank}><ShieldCheck size={46}/>
          <h2>Chọn một đóng góp để kiểm tra</h2>
          <p>Xem ảnh thật, vị trí, thông tin, điều chỉnh trước khi đưa lên 11Local.</p></div>}
        {selectedId && detailBusy && <div className={styles.blank}>Đang tải dữ liệu và ảnh đóng góp…</div>}
        {selectedId && !detailBusy && detail && detail.contribution.kind !== "new_place" &&
           <ExistingReview detail={detail} onComplete={message=>{
             setSelectedId(null);setDetail(null);setDraft(null);setNotice(message);void loadList(filter);
           }}/>}
         {selectedId && !detailBusy && detail && draft && detail.contribution.kind === "new_place" &&
           <div className={styles.editor} key={detail.contribution.id}>
          <div className={styles.editorHeading}>
            <div><span className={styles.code}>{detail.contribution.tracking_code}</span>
              <h2>{draft.name || "Địa điểm chưa đặt tên"}</h2>
              <p>Gửi lúc {stamp(detail.contribution.created_at)} · Trạng thái: {
                statuses.find(s => s.value === detail.contribution.moderation_status)?.label
              }</p></div>
            {detail.publishedPlace && <Link className={styles.external}
              href={"/dia-diem/" + detail.publishedPlace.slug} target="_blank" rel="noopener noreferrer">
              Xem địa điểm đã duyệt <ExternalLink size={14}/></Link>}
          </div>
          {research && <section className={styles.warning}>
            <strong>Địa điểm nghiên cứu — {String(research.priority ?? "Chưa xếp ưu tiên")}</strong>
            <p>Chưa được xác minh hoặc công khai. Nguồn và thông tin bên dưới chỉ phục vụ kiểm duyệt.</p>
            <p>{String(research.auditNotes ?? "")}</p>
            {["source1","source2","googleSearchUrl","osmUrl"].map(key => {
              const url = research[key];
              return typeof url === "string" && url.startsWith("https://")
                ? <p key={key}><a href={url} target="_blank" rel="noopener noreferrer">
                    {key === "source1" ? "Nguồn 1" : key === "source2" ? "Nguồn 2" : key === "osmUrl" ? "OSM gợi ý" : "Tìm trên Google Maps"}
                    <ExternalLink size={12}/></a></p>
                : null;
            })}
            {research.duplicateWarning && <p><b>Nghi trùng:</b> {String(research.duplicateWarning)}</p>}
            {!savedResearchPin && <p><b>Chưa có tọa độ được xác nhận.</b> Hãy đặt ghim thật, lưu chỉnh sửa rồi mới duyệt. Ghim hiện tại chỉ là vị trí xem bản đồ mặc định.</p>}
          </section>}
          <form className={styles.form} onSubmit={save}>
            <div className={styles.sectionHeading}><h3>Thông tin đề xuất</h3>
              <span>{dirty ? "Có thay đổi chưa lưu" : "Thông tin đã lưu"}</span></div>
            <div className={styles.fields}>
              <label className={styles.field}>Tên địa điểm *
                <input required maxLength={160} disabled={!reviewable} value={draft.name}
                  onChange={e => change("name", e.target.value)}/></label>
              <label className={styles.field}>Danh mục *
                <select disabled={!reviewable} value={draft.categoryId}
                  onChange={e => changeCategory(e.target.value)}>
                  {detail.categories.map(cat => <option key={cat.id} value={cat.id}>
                    {cat.name}{cat.visibility === "hidden" ? " (đang ẩn)" : ""}
                  </option>)}</select></label>
              <label className={styles.field}>Loại địa điểm
                <select disabled={!reviewable} value={draft.placeKind}
                  onChange={e => change("placeKind", e.target.value as ReviewPlace["placeKind"])}>
                  <option value="business">Cơ sở kinh doanh</option>
                  <option value="attraction">Điểm tham quan</option>
                  <option value="public_place">Địa điểm công cộng</option></select></label>
              <label className={styles.field}>Khu vực *
                <input required maxLength={120} disabled={!reviewable}
                  value={draft.area} onChange={e => change("area", e.target.value)}/></label>
              <label className={styles.field + " " + styles.wide}>Địa chỉ *
                <input required maxLength={500} disabled={!reviewable} value={draft.address}
                  onChange={e => change("address", e.target.value)}/></label>
              <label className={styles.field + " " + styles.wide}>Giới thiệu ngắn (thẻ)
                <textarea maxLength={350} disabled={!reviewable} rows={2} value={draft.summary}
                  onChange={e => change("summary", e.target.value)}/></label>
              <label className={styles.field + " " + styles.wide}>Mô tả chi tiết
                <textarea maxLength={3000} disabled={!reviewable} rows={4} value={draft.description}
                  onChange={e => change("description", e.target.value)}/></label>
              <label className={styles.field}>Số điện thoại địa điểm
                <input maxLength={40} disabled={!reviewable} value={draft.phone}
                  onChange={e => change("phone", e.target.value)}/></label>
              <label className={styles.field}>Giờ mở cửa
                <input maxLength={300} disabled={!reviewable} value={draft.openingHours}
                  onChange={e => change("openingHours", e.target.value)}/></label>
              <label className={styles.field}>Website
                <input type="url" maxLength={500} disabled={!reviewable}
                  value={draft.websiteUrl} onChange={e => change("websiteUrl", e.target.value)}/></label>
              <label className={styles.field}>Facebook
                <input type="url" maxLength={500} disabled={!reviewable}
                  value={draft.facebookUrl || ""} onChange={e => change("facebookUrl", e.target.value)}/></label>
              <label className={styles.field}>YouTube
                <input type="url" maxLength={500} disabled={!reviewable}
                  value={draft.youtubeUrl || ""} onChange={e => change("youtubeUrl", e.target.value)}/></label>
              <label className={styles.field}>Giá tham khảo
                <input maxLength={300} disabled={!reviewable}
                  value={draft.priceNote} onChange={e => change("priceNote", e.target.value)}/></label>
            </div>
            {selectedFields.length > 0 && <div className={styles.extras}>
              <h3>Thông tin theo danh mục</h3>
              <p>Được lấy từ cấu hình trường dữ liệu hiện tại trên Neon.</p>
              <div className={styles.fields}>
                {selectedFields.map(field => <DynamicField key={field.field_key} field={field}
                  disabled={!reviewable} value={draft.details[field.field_key]}
                  onChange={value => changeExtra(field.field_key, value)}/>)}
              </div></div>}
            <div className={styles.mapSection}>
              <h3><MapPin size={17}/> Xác nhận vị trí</h3>
              <p>Giữ và kéo trực tiếp ghim xanh để chỉnh vị trí, hoặc nhập tọa độ thủ công. Kéo nền bản đồ không làm đổi tọa độ.</p>
              {reviewable
                ? <LocationPicker key={detail.contribution.id} latitude={draft.latitude} longitude={draft.longitude}
                    onChange={(longitude, latitude) => { setDraft(p => p ? { ...p, latitude, longitude } : p); setDirty(true); setCoordinatePicked(true); }}/>
                : <div className={styles.coordinates}>Vĩ độ: {draft.latitude.toFixed(6)} · Kinh độ: {draft.longitude.toFixed(6)}</div>}
            </div>
            {detail.nearby.length > 0 && <div className={styles.warning}>
              <strong>Cảnh báo địa điểm gần trùng</strong>
              {detail.nearby.map(place => <div key={place.id} className={styles.duplicate}>
                <span>{place.name} · khoảng {place.distanceMeters} m</span>
                <Link href={"/dia-diem/" + place.slug} target="_blank" rel="noopener noreferrer">Xem</Link>
              </div>)}
            </div>}
            <div className={styles.photoSection}>
              <h3><Camera size={17}/> Hình ảnh chờ kiểm duyệt ({detail.photos.length})</h3>
              <p>Chọn những ảnh được công khai. Chỉ một ảnh làm bìa.</p>
              {detail.photos.length === 0 && <span className={styles.hint}>Không có ảnh đóng góp.</span>}
              <div className={styles.photos}>{detail.photos.map(photo => {
                const enabled = included.includes(photo.id);
                return <div key={photo.id} className={styles.photo} data-disabled={!enabled}>
                  {/* Admin session is required to load private staged photos. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.published
                    ? "/api/place-photos/" + photo.id
                    : "/api/admin/contributions/" + detail.contribution.id + "/photos/" + photo.id}
                    alt={"Ảnh địa điểm " + (photo.sort_order + 1)}/>
                  <label><input type="checkbox" disabled={!reviewable}
                    checked={enabled} onChange={e => {
                      setIncluded(list => e.target.checked ? [...list, photo.id] : list.filter(v => v !== photo.id));
                      if (!e.target.checked && coverId === photo.id) setCoverId(null);
                    }}/> Duyệt ảnh</label>
                  <label><input type="radio" name="cover-photo" disabled={!reviewable || !enabled}
                    checked={coverId === photo.id} onChange={() => setCoverId(photo.id)}/> Ảnh bìa</label>
                </div>;
              })}</div>
              <p className={styles.hint}>Đã chọn {selectedPhotos.length}/{detail.photos.length} ảnh. Ảnh không được chọn sẽ không công khai.</p>
            </div>
            <div className={styles.contact}>
              <h3>Liên hệ người đóng góp (chỉ Admin)</h3>
              {detail.contribution.contact_phone
                ? <a href={"tel:" + detail.contribution.contact_phone}>{detail.contribution.contact_phone}</a>
                : <p>Người gửi không cung cấp số điện thoại.</p>}
            </div>
            {reviewable && <button type="submit" className={styles.save} disabled={busy || !dirty}>
              <Save size={17}/>{busy ? "Đang lưu…" : "Lưu chỉnh sửa (chưa duyệt)"}</button>}
          </form>
          {detail.messages?.length > 0 && <section className={styles.contact}>
             <h3>Lịch sử yêu cầu bổ sung</h3>
             {detail.messages.map((m,i)=><div key={i} style={{padding:"9px 0",borderBottom:"1px solid #dae8df"}}>
               <strong>{m.sender === "admin" ? "Admin" : "Người gửi"}</strong>
               <small> · {stamp(m.created_at)}</small>
               <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{m.body}</p>
             </div>)}
           </section>}
           {reviewable && <section className={styles.decisions}>
            <h3>Quyết định kiểm duyệt</h3>
            <label className={styles.field}>Ghi chú / lý do
              <textarea rows={3} maxLength={1200} placeholder="Bắt buộc khi từ chối hoặc yêu cầu bổ sung; ghi lý do khi duyệt địa điểm trùng."
                value={note} onChange={e => setNote(e.target.value)}/></label>
            <label className={styles.duplicateOverride}>
              <input type="checkbox" checked={allowDuplicate}
                onChange={e => setAllowDuplicate(e.target.checked)}/>
              <span>Tôi đã kiểm tra và xác nhận địa điểm này khác địa điểm trùng. (Cần ghi lý do)</span>
            </label>
            <div className={styles.actions}>
              <button type="button" className={styles.approve} disabled={busy || (!!research && (!savedResearchPin || dirty))} onClick={() => void decide("approve")}>
                <Check size={18}/> Duyệt & công khai</button>
              <button type="button" className={styles.info} disabled={busy} onClick={() => void decide("needs_info")}>
                Cần bổ sung</button>
              <button type="button" className={styles.reject} disabled={busy} onClick={() => void decide("reject")}>
                <XCircle size={17}/> Từ chối</button>
            </div>
          </section>}
          {!reviewable && <div className={styles.completed}><ShieldCheck size={18}/>
            Đóng góp đã được xử lý. {detail.contribution.decision_note || "Không có ghi chú."}</div>}
        </div>}
      </section>
    </div>
  </main>;
}
