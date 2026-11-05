import {useEffect,useState} from "react";
import {Link,useParams} from "react-router-dom";
import {
  ArrowLeft,BadgeCheck,Camera,CheckCircle2,Clock3,ExternalLink,
  ImagePlus,LockKeyhole,RefreshCw,Save,ShieldCheck,Store,Trash2,
} from "lucide-react";
import {useApp} from "../store.jsx";
import {Banner,Button,StateBlock} from "../components/ui.jsx";
import "../styles/owner-editor.css";

const FIELDS=[
  ["summary","Giới thiệu ngắn",350,"textarea"],
  ["description","Giới thiệu chi tiết",5000,"textarea"],
  ["address","Địa chỉ",500,"input"],
  ["phone","Số điện thoại quán",40,"tel"],
  ["website_url","Website",500,"url"],
  ["facebook_url","Facebook",500,"url"],
  ["youtube_url","YouTube",500,"url"],
  ["opening_hours","Giờ mở cửa",500,"input"],
  ["price_note","Giá và dịch vụ",300,"textarea"],
];
const labels=Object.fromEntries(FIELDS.map(x=>[x[0],x[1]]));
const statusLabel={pending:"Chờ Admin duyệt",approved:"Đã duyệt",
  rejected:"Bị từ chối / Đã ẩn",needs_info:"Cần bổ sung",superseded:"Đã thay thế"};
const errorLabel={
  STALE_VERSION:"Thông tin địa điểm đã thay đổi. Hãy tải lại trước khi gửi.",
  PENDING_REVISION:"Bạn còn bản sửa đang chờ duyệt. Hãy chờ Admin xử lý.",
  NO_CHANGES:"Bạn chưa thay đổi thông tin nào.",
  FIELD_NOT_ALLOWED:"Trường này không cho phép chủ địa điểm chỉnh sửa.",
  PLACE_NOT_EDITABLE:"Địa điểm không còn công khai hoặc không hỗ trợ chỉnh sửa.",
  FORBIDDEN:"Bạn không còn quyền quản lý địa điểm này.",
  LOGIN_REQUIRED:"Phiên Google đã hết hạn. Hãy đăng nhập lại.",
  INVALID_IMAGE:"Chỉ nhận JPEG, PNG, WebP, AVIF tối đa 10MB và ảnh tối ưu dưới 2MB.",
  IMAGE_LIMIT:"Đã đạt giới hạn ảnh đang sử dụng của quán.",
  PHOTO_NOT_APPROVED:"Chỉ ảnh đã được Admin duyệt mới có thể thay bìa hoặc ẩn.",
  PHOTO_NOT_FOUND:"Bạn không có quyền thay đổi ảnh này.",
  INVALID_CAPTION:"Chú thích ảnh không hợp lệ.",
  PERMISSION_REVOKED:"Quyền quản lý đã bị thu hồi.",
};
const readJson=async(url,options)=>{
  const response=await fetch(url,{cache:"no-store",...options});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"UNAVAILABLE");
  return data;
};
function errorText(e){
  const code=e?.message||"UNAVAILABLE";
  return errorLabel[code]|| (code.startsWith("INVALID_FIELD:")?
    "Thông tin không hợp lệ: "+(labels[code.slice(14)]||code.slice(14)):
    "Không thực hiện được thao tác. Vui lòng thử lại.");
}
const dateText=s=>new Date(s).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"});

export function OwnerEditor(){
  const {id}=useParams();
  const {currentUser,authState}=useApp();
  const [data,setData]=useState(null);
  const [draft,setDraft]=useState({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [tab,setTab]=useState("info");
  const [file,setFile]=useState(null);
  const [caption,setCaption]=useState("");
  const [loadKey,setLoadKey]=useState(0);
  const reload=()=>{setLoadKey(n=>n+1);setSuccess("");setError("");};
  useEffect(()=>{
    if(!currentUser)return;
    const ctl=new AbortController();
    void Promise.resolve().then(async()=>{
      if(ctl.signal.aborted)return;
      try{
        const body=await readJson("/api/managed-places/"+encodeURIComponent(id),{signal:ctl.signal});
        if(ctl.signal.aborted)return;
        setData(body);setDraft(Object.fromEntries(FIELDS.map(([key])=>[key,body.place[key]||""])));
        setError("");
      }catch(e){if(e.name!=="AbortError"&&!ctl.signal.aborted)setError(errorText(e));}
      finally{if(!ctl.signal.aborted)setLoading(false);}
    });
    return()=>ctl.abort();
  },[id,currentUser,loadKey]);
  async function save(e){
    e.preventDefault();if(!data||busy)return;
    const changes={};
    for(const [key] of FIELDS){
      const current=String(data.place[key]??"").trim();
      const candidate=String(draft[key]??"").trim();
      if(current!==candidate)changes[key]=candidate;
    }
    if(!Object.keys(changes).length){setError(errorLabel.NO_CHANGES);return;}
    setBusy(true);setError("");setSuccess("");
    try{
      await readJson("/api/managed-places/"+encodeURIComponent(id),{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({expectedVersion:data.place.version,changes}),
      });
      setSuccess("Đã gửi đề xuất. Thông tin công khai hiện tại sẽ giữ nguyên đến khi Admin duyệt.");
      setLoadKey(n=>n+1);
    }catch(e){setError(errorText(e));}
    finally{setBusy(false);}
  }
  async function upload(e){
    e.preventDefault();if(!file||busy)return;
    setBusy(true);setError("");setSuccess("");
    try{
      const body=new FormData();
      body.set("file",file);body.set("caption",caption);
      await readJson("/api/managed-places/"+encodeURIComponent(id)+"/photos",{
        method:"POST",body});
      setFile(null);setCaption("");
      const picker=document.getElementById("owner-image-file");if(picker)picker.value="";
      setSuccess("Đã gửi ảnh. Chỉ khi Admin duyệt, ảnh mới hiển thị công khai.");
      setLoadKey(n=>n+1);
    }catch(e){setError(errorText(e));}
    finally{setBusy(false);}
  }
  async function photoAction(photo,action){
    if(busy||!data)return;
    const confirmText=action==="cover"?
      "Dùng ảnh đã duyệt này làm ảnh bìa của quán?":
      "Ẩn ảnh do quán đăng? Ảnh vẫn được lưu, không xóa ảnh cộng đồng.";
    if(!window.confirm(confirmText))return;
    setBusy(true);setError("");setSuccess("");
    try{
      await readJson("/api/managed-places/"+encodeURIComponent(id)+"/photos/"+
        encodeURIComponent(photo.id),{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action}),
      });
      setSuccess(action==="cover"?"Đã cập nhật ảnh bìa.":"Đã ẩn ảnh của quán.");
      setLoadKey(n=>n+1);
    }catch(e){setError(errorText(e));}
    finally{setBusy(false);}
  }
  if(authState==="loading")return <div className="container page">Đang xác thực tài khoản…</div>;
  if(authState==="error")return <div className="container page"><Banner type="warning">Không xác thực được phiên Google.</Banner></div>;
  if(!currentUser)return <div className="container page"><StateBlock kind="restricted"
    title="Bạn cần đăng nhập Google" actions={
      <a className="btn btn-primary" href={"/api/auth/google/start?returnTo="+encodeURIComponent("/quan-ly/"+id)}>Đăng nhập Google</a>
    }>Chỉ tài khoản đang được Admin cấp quyền mới quản lý được quán.</StateBlock></div>;
  const place=data?.place;
  const revisions=data?.revisions||[];
  const pending=revisions.find(x=>x.status==="pending");
  const photos=data?.photos||[];
  const owner=place?.role==="owner";
  return <div className="container page owner-editor">
    <Link to="/quan-ly" className="owner-editor-back"><ArrowLeft size={16}/> Địa điểm của tôi</Link>
    <header className="owner-editor-head">
      <div><span><Store size={18}/> 11Local · Quản lý địa điểm</span>
        <h1>{place?.name||"Quản lý quán"}</h1>
        <p>{place?.address||"Thông tin của bạn sẽ được kiểm duyệt trước khi công khai."}</p>
      </div>
      {place&&<Link to={"/ban-do?place="+encodeURIComponent(place.slug)+"&detail=1"}
        className="btn btn-outline btn-sm">Xem trang công khai <ExternalLink size={15}/></Link>}
    </header>
    {error&&<Banner type="danger">{error}</Banner>}
    {success&&<Banner type="success">{success}</Banner>}
    {loading&&!data&&<p role="status">Đang tải thông tin thật…</p>}
    {!loading&&!data&&<StateBlock kind="restricted" title="Không mở được địa điểm này">
      Tài khoản không có quyền quản lý hoạt động hoặc địa điểm không tồn tại.</StateBlock>}
    {place&&<div className="owner-editor-grid">
      <main className="owner-editor-main">
        <a href={"/thong-ke/"+id} className="btn btn-outline">Thống kê địa điểm</a>
        <a href={"/quan-ly-menu/"+id} className="btn btn-outline">Quản lý menu và bảng giá</a>
        <nav className="owner-editor-tabs" aria-label="Phần quản lý">
          <button type="button" aria-pressed={tab==="info"} onClick={()=>setTab("info")}>
            <Save size={16}/> Thông tin quán</button>
          <button type="button" aria-pressed={tab==="photos"} onClick={()=>setTab("photos")}>
            <Camera size={16}/> Hình ảnh ({photos.length})</button>
        </nav>
        {tab==="info"&&<form className="owner-editor-card" onSubmit={save}>
          <div className="owner-editor-section-title"><div><h2>Chỉnh sửa thông tin</h2>
            <p>Giữ nguyên bản công khai tới khi Admin xét duyệt.</p></div>
            <span className="badge badge-success"><ShieldCheck size={13}/> {owner?"Chủ quán":"Người quản lý"}</span>
          </div>
          <div className="owner-editor-fields">
            {FIELDS.map(([key,label,max,type])=><label key={key} className={["description","summary","address"].includes(key)?"wide":""}>
              {label}{type==="textarea"?
                <textarea rows={key==="description"?5:3} maxLength={max} value={draft[key]||""}
                  onChange={e=>setDraft(prev=>({...prev,[key]:e.target.value}))}
                  disabled={busy||!!pending}/>:
                <input type={type} maxLength={max} value={draft[key]||""}
                  onChange={e=>setDraft(prev=>({...prev,[key]:e.target.value}))}
                  disabled={busy||!!pending}/>}
            </label>)}
          </div>
          <p className="owner-editor-note"><LockKeyhole size={16}/>
            Ghim bản đồ, slug, danh mục và trạng thái hiển thị chỉ Admin được sửa.</p>
          <Button type="submit" loading={busy} disabled={!!pending} icon={Save}>
            {pending?"Đang chờ duyệt bản sửa":"Gửi thay đổi để Admin duyệt"}</Button>
          {pending&&<p className="owner-editor-hint"><Clock3 size={16}/>
            Bạn đang có một bản sửa chờ duyệt, không thể gửi bản mới cho đến khi Admin xử lý.</p>}
        </form>}
        {tab==="photos"&&<section className="owner-editor-card">
          <div className="owner-editor-section-title"><div><h2>Hình ảnh của quán</h2>
            <p>Chỉ quản lý ảnh do quán đăng; không được xóa ảnh cộng đồng.</p></div></div>
          <form onSubmit={upload} className="owner-photo-upload">
            <label htmlFor="owner-image-file"><ImagePlus size={21}/>
              <strong>Chọn ảnh để gửi duyệt</strong><small>JPEG, PNG, WebP, AVIF tối đa 10 MB</small></label>
            <input id="owner-image-file" type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={e=>setFile(e.target.files?.[0]||null)} disabled={busy}/>
            {file&&<p className="owner-editor-hint">Đã chọn: {file.name}</p>}
            <label className="owner-photo-caption">Mô tả ảnh
              <input type="text" maxLength={300} value={caption} onChange={e=>setCaption(e.target.value)}
                placeholder="VD: Không gian quán, thực đơn, mặt tiền…" disabled={busy}/></label>
            <Button type="submit" disabled={!file} loading={busy} icon={ImagePlus}>Gửi ảnh chờ duyệt</Button>
          </form>
          {!photos.length?<p className="owner-editor-empty">Quán chưa đăng ảnh nào. Ảnh có sẵn từ Admin và cộng đồng không nằm trong danh sách này.</p>:
            <div className="owner-photo-grid">{photos.map(photo=><article key={photo.id} className="owner-photo-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" alt={photo.caption||"Ảnh của quán"}
                src={"/api/managed-places/"+encodeURIComponent(id)+"/photos/"+photo.id+"/image"}/>
              <div><span className={"badge badge-"+(photo.moderation_status==="approved"?"success":
                photo.moderation_status==="pending"?"warning":"neutral")}>
                  {statusLabel[photo.moderation_status]||photo.moderation_status}</span>
                {photo.photo_type==="cover"&&<span className="badge badge-success"><BadgeCheck size={12}/> Ảnh bìa</span>}
              </div>
              {photo.caption&&<p>{photo.caption}</p>}
              {owner&&photo.moderation_status==="approved"&&<div className="owner-photo-actions">
                {photo.photo_type!=="cover"&&<button type="button" disabled={busy}
                  onClick={()=>void photoAction(photo,"cover")}><BadgeCheck size={15}/> Chọn ảnh bìa</button>}
                <button type="button" disabled={busy}
                  onClick={()=>void photoAction(photo,"hide")}><Trash2 size={15}/> Ẩn ảnh</button>
              </div>}
            </article>)}</div>}
        </section>}
      </main>
      <aside className="owner-editor-aside">
        <section><h3><Clock3 size={18}/> Lịch sử đề xuất</h3>
          {!revisions.length?<p>Chưa có bản sửa thông tin nào từ tài khoản này.</p>:
            revisions.map(rev=><article className="owner-revision" key={rev.id}>
              <span className={"badge badge-"+(rev.status==="approved"?"success":rev.status==="pending"?"warning":"neutral")}>
                {statusLabel[rev.status]||rev.status}</span>
              <small>{dateText(rev.created_at)}</small>
              <ul>{Object.keys(rev.changes||{}).map(key=><li key={key}>{
                FIELDS.find(field=>field[0]===key)?.[1]||key}</li>)}</ul>
              {rev.decision_note&&<p>{rev.decision_note}</p>}
            </article>)}
        </section>
        <section className="owner-editor-help"><h3><ShieldCheck size={18}/> Quy tắc 11Local</h3>
          <p>Chủ quán có thể gửi thay đổi về thông tin, giá, giờ mở cửa và ảnh. Admin duyệt trước khi công khai.</p>
          <p>Chỉ chủ địa điểm được chọn ảnh bìa hoặc ẩn ảnh do quán đăng. Ảnh cộng đồng luôn được quản lý riêng.</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={reload}
            disabled={busy}><RefreshCw size={15}/> Làm mới dữ liệu</button>
        </section>
      </aside>
    </div>}
  </div>;
}
