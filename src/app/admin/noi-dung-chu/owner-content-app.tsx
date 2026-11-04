"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {
  ArrowLeft,ArrowRight,BadgeCheck,Camera,CheckCircle2,Clock3,
  FilePenLine,RefreshCw,ShieldCheck,XCircle,
} from "lucide-react";
import styles from "./owner-content.module.css";

type Revision={
  id:string;place_id:string;place_name:string;slug:string;
  sender_name:string|null;email:string|null;submitted_by:string;
  base_version:number;place_version:number;changes:Record<string,string|null>;
  status:string;created_at:string;
};
type Photo={
  id:string;place_id:string;place_name:string;slug:string;
  sender_name:string|null;email:string|null;submitted_by:string;
  caption:string|null;created_at:string;
};
type Queue={revisions:Revision[];photos:Photo[]};
type Filter="revisions"|"photos";
const names:Record<string,string>={
  summary:"Giới thiệu ngắn",description:"Giới thiệu chi tiết",address:"Địa chỉ",
  phone:"Số điện thoại",website_url:"Website",opening_hours:"Giờ mở cửa",
  price_note:"Giá và dịch vụ",
};
const errors:Record<string,string>={
  ALREADY_REVIEWED:"Nội dung đã được xử lý trong một phiên khác.",
  STALE_PLACE:"Thông tin quán đã thay đổi sau khi chủ gửi bản sửa. Hãy từ chối và yêu cầu gửi lại.",
  PERMISSION_REVOKED:"Người gửi đã mất quyền quản lý; không thể phê duyệt nội dung cũ.",
  REASON_REQUIRED:"Từ chối bắt buộc nhập lý do ít nhất 5 ký tự.",
  UNAUTHORIZED:"Phiên đăng nhập Admin đã hết hạn.",
  FIELD_NOT_ALLOWED:"Bản sửa chứa trường ngoài phạm vi cho phép.",
  NOT_FOUND:"Nội dung không còn tồn tại.",
};
function stamp(value:string){return new Date(value).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"});}
function publicUrl(slug:string){return "/ban-do?place="+encodeURIComponent(slug)+"&detail=1";}
const blank:Queue={revisions:[],photos:[]};
export default function OwnerContentApp(){
  const [auth,setAuth]=useState<boolean|null>(null);
  const [queue,setQueue]=useState<Queue>(blank);
  const [filter,setFilter]=useState<Filter>("revisions");
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [feedback,setFeedback]=useState<{type:"error"|"success";message:string}|null>(null);

  const load=useCallback(async(signal?:AbortSignal)=>{
    try{
      const res=await fetch("/api/admin/owner-content",{cache:"no-store",signal});
      if(res.status===401){
        if(!signal?.aborted){setAuth(false);setQueue(blank);}
        return;
      }
      if(!res.ok)throw new Error("QUEUE_UNAVAILABLE");
      const body=await res.json() as Queue;
      if(signal?.aborted)return;
      setAuth(true);
      setQueue({revisions:Array.isArray(body.revisions)?body.revisions:[],
        photos:Array.isArray(body.photos)?body.photos:[]});
    }catch(e){
      if((e as Error).name!=="AbortError"&&!signal?.aborted)
        setFeedback({type:"error",message:"Chưa đọc được hàng chờ nội dung chủ quán. Hãy làm mới."});
    }finally{
      if(!signal?.aborted)setLoading(false);
    }
  },[]);
  useEffect(()=>{
    const ctl=new AbortController();
    void Promise.resolve().then(()=>{if(!ctl.signal.aborted)return load(ctl.signal);});
    return()=>ctl.abort();
  },[load]);
  const items=filter==="revisions"?queue.revisions:queue.photos;
  const selected=items.find(x=>x.id===selectedId)||items[0]||null;
  const isRevision=filter==="revisions";
  const refresh=async()=>{setFeedback(null);setLoading(true);await load();};
  async function decide(action:"approve"|"reject"){
    if(!selected||busy)return;
    if(action==="reject"&&note.trim().length<5){
      setFeedback({type:"error",message:errors.REASON_REQUIRED});return;
    }
    if(action==="approve"&&!window.confirm(
      isRevision?"Duyệt bản sửa và cập nhật thông tin công khai?":"Duyệt ảnh để hiển thị công khai?"))return;
    setBusy(true);setFeedback(null);
    try{
      const url="/api/admin/owner-content/"+(isRevision?"revisions":"photos")+
        "/"+encodeURIComponent(selected.id)+"/decision";
      const res=await fetch(url,{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,note:note.trim()})});
      const body=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(body.error||"DECISION_UNAVAILABLE");
      setSelectedId(null);setNote("");
      setFeedback({type:"success",message:action==="approve"?
        "Đã duyệt và cập nhật nội dung công khai.":"Đã từ chối và ghi nhận lý do."});
      await load();
    }catch(e){
      const code=(e as Error).message;
      if(code==="UNAUTHORIZED")setAuth(false);
      setFeedback({type:"error",message:errors[code]||"Không thể xử lý yêu cầu. Hãy thử lại."});
      if(["ALREADY_REVIEWED","STALE_PLACE","PERMISSION_REVOKED"].includes(code))await load();
    }finally{setBusy(false);}
  }
  if(auth===null&&loading)return <main className={styles.gate}>Đang kiểm tra quyền Admin…</main>;
  if(auth===false)return <main className={styles.gate}>
    <div className={styles.gateCard}><ShieldCheck size={32}/>
      <h1>Kiểm duyệt nội dung chủ quán</h1>
      <p>Trang này chỉ dành cho Admin 11Local.</p>
      <Link href="/admin" className={styles.primary}>Đăng nhập Admin <ArrowRight size={16}/></Link></div>
  </main>;
  return <main className={styles.root}>
    <header className={styles.header}>
      <div><Link href="/admin" className={styles.back}><ArrowLeft size={16}/> Quản trị địa điểm</Link>
        <h1>Duyệt nội dung chủ quán</h1>
        <p>Thông tin và ảnh mới phải qua Admin trước khi công khai.</p></div>
      <div className={styles.headerButtons}>
        <Link href="/admin/xac-minh" className={styles.secondary}>Xác minh chủ quán</Link>
        <button className={styles.secondary} type="button" onClick={()=>void refresh()}
          disabled={busy||loading}><RefreshCw size={16}/> Làm mới</button>
      </div>
    </header>
    <div className={styles.stats}>
      <div><strong>{queue.revisions.length}</strong><span>Bản sửa đang chờ</span></div>
      <div><strong>{queue.photos.length}</strong><span>Ảnh đang chờ</span></div>
    </div>
    <nav className={styles.tabs} aria-label="Loại nội dung">
      <button type="button" aria-pressed={filter==="revisions"} onClick={()=>{
        setFilter("revisions");setSelectedId(null);setNote("");setFeedback(null);}}>
        <FilePenLine size={17}/> Đề xuất sửa thông tin</button>
      <button type="button" aria-pressed={filter==="photos"} onClick={()=>{
        setFilter("photos");setSelectedId(null);setNote("");setFeedback(null);}}>
        <Camera size={17}/> Ảnh của chủ địa điểm</button>
    </nav>
    {feedback&&<p role={feedback.type==="error"?"alert":"status"}
      className={feedback.type==="error"?styles.error:styles.success}>
      {feedback.type==="error"?<XCircle size={16}/>:<CheckCircle2 size={16}/>}
      {feedback.message}</p>}
    <div className={styles.columns}>
      <aside className={styles.queue}>
        <h2>Hàng chờ <small>{loading?"Đang tải…":items.length+" yêu cầu"}</small></h2>
        {!loading&&!items.length&&<p className={styles.empty}>Chưa có nội dung mới cần kiểm duyệt.</p>}
        {items.map(item=><button type="button" key={item.id} data-selected={selected?.id===item.id}
          className={styles.item} onClick={()=>{setSelectedId(item.id);setNote("");setFeedback(null);}}>
          <strong>{item.place_name}</strong>
          <span>{item.sender_name||item.email||"Người quản lý"}</span>
          <small><Clock3 size={13}/>{stamp(item.created_at)}</small>
        </button>)}
      </aside>
      <section className={styles.detail}>
        {!selected?<div className={styles.blank}><ShieldCheck size={33}/>
          <h2>Không có yêu cầu</h2><p>Ảnh và bản sửa mới sẽ xuất hiện khi chủ quán gửi.</p></div>:
          <div className={styles.body}>
            <div className={styles.detailTop}>
              <div><span className={styles.overline}><ShieldCheck size={14}/> Chủ đã xác minh</span>
                <h2>{selected.place_name}</h2>
                <p>{selected.sender_name||selected.email||"Tài khoản Google"}</p></div>
              <Link href={publicUrl(selected.slug)} target="_blank"
                rel="noopener noreferrer" className={styles.secondary}>Xem quán <ArrowRight size={14}/></Link>
            </div>
            {isRevision&&"changes" in selected?
              <div className={styles.section}>
                <h3><FilePenLine size={17}/> Nội dung đề xuất</h3>
                {selected.base_version!==selected.place_version&&<p className={styles.warning}>
                  Bản sửa dựa trên phiên bản cũ. Không thể duyệt nếu dữ liệu quán đã thay đổi.</p>}
                {Object.entries(selected.changes).map(([key,value])=><div className={styles.change} key={key}>
                  <small>{names[key]||key}</small><p>{value===null?"(Không có thông tin)":value}</p></div>)}
                <p className={styles.hint}>Thông tin công khai chưa thay đổi. Duyệt sẽ áp dụng đúng các trường trên.</p>
              </div>:
              <div className={styles.section}>
                <h3><Camera size={17}/> Ảnh mới của quán</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.photo}
                  src={"/api/admin/photos/"+selected.id} alt="Ảnh chờ Admin duyệt"/>
                {"caption" in selected&&selected.caption&&<p>{selected.caption}</p>}
                <p className={styles.hint}>Ảnh chưa được công khai. Duyệt sẽ thêm ảnh vào thư viện quán.</p>
              </div>}
            <div className={styles.review}>
              <h3><BadgeCheck size={17}/> Quyết định của Admin</h3>
              <label>Ghi chú / lý do
                <textarea rows={3} maxLength={1000} placeholder="Bắt buộc ghi lý do khi từ chối…"
                  value={note} onChange={e=>setNote(e.target.value)}/></label>
              <div className={styles.actions}>
                <button type="button" className={styles.approve}
                  disabled={busy||loading||(isRevision&&"changes" in selected&&selected.base_version!==selected.place_version)}
                  onClick={()=>void decide("approve")}><CheckCircle2 size={17}/> Duyệt công khai</button>
                <button type="button" className={styles.reject} disabled={busy||loading||note.trim().length<5}
                  onClick={()=>void decide("reject")}><XCircle size={17}/> Từ chối</button>
              </div>
            </div>
          </div>}
      </section>
    </div>
  </main>;
}
