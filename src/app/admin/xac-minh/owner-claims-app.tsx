"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {
  ArrowLeft,ArrowRight,BadgeCheck,Check,ChevronLeft,ChevronRight,
  Clock3,ExternalLink,FileSearch,Image as ImageIcon,
  LockKeyhole,Phone,RefreshCw,ShieldAlert,ShieldCheck,
  Store,UserRound,Users,XCircle,
} from "lucide-react";
import styles from "./owner-claims.module.css";

type ClaimStatus="pending"|"needs_info"|"disputed"|"approved"|"rejected";
type Filter=ClaimStatus|"all";
type Claim={
  id:string;place_id:string;place_name:string;slug:string;address:string;
  user_id:string;email:string;display_name:string;claimant_name:string;
  contact_phone:string;relationship:"owner"|"authorized";
  status:ClaimStatus;version:number;decision_note:string|null;
  review_method:string|null;reviewed_at:string|null;created_at:string;updated_at:string;
  image_count:number;
};
type DetailClaim=Claim & {evidence:{statement?:string};ownership_status:string;place_kind:string};
type Detail={
  claim:DetailClaim;
  messages:Array<{id:string;sender:"admin"|"claimant";body:string;created_at:string}>;
  photos:Array<{id:string;created_at:string}>;
  managers:Array<{user_id:string;role:"owner"|"manager";
    status:"active"|"suspended"|"revoked";version:number;granted_at:string;
    display_name:string;email:string}>;
};
type Feedback={kind:"error"|"success";text:string};
type Action="approve"|"reject"|"needs_info"|"dispute";
type ManagerAction="suspend"|"resume"|"revoke";
const filters:Array<{id:Filter;label:string}>=[
  {id:"pending",label:"Chờ xác minh"},
  {id:"needs_info",label:"Cần bổ sung"},
  {id:"disputed",label:"Tranh chấp"},
  {id:"approved",label:"Đã duyệt"},
  {id:"rejected",label:"Đã từ chối"},
  {id:"all",label:"Tất cả"},
];
const statusLabels:Record<string,string>={
  pending:"Chờ xác minh",needs_info:"Chờ bổ sung",disputed:"Tranh chấp",
  approved:"Đã duyệt",rejected:"Đã từ chối",
};
const errorLabels:Record<string,string>={
  UNAUTHORIZED:"Phiên Admin đã hết hạn. Hãy đăng nhập lại.",
  STALE_VERSION:"Hồ sơ đã thay đổi trên máy khác. Hãy tải lại trước khi xử lý.",
  OWNER_EXISTS:"Địa điểm đã có chủ đang hoạt động. Hãy kiểm tra và xử lý quyền cũ trước khi duyệt.",
  ALREADY_REVIEWED:"Hồ sơ này đã được xử lý. Không thể duyệt lại cùng phiên.",
  PLACE_NOT_CLAIMABLE:"Địa điểm không còn đủ điều kiện nhận quyền.",
  ACCOUNT_NOT_VERIFIED:"Tài khoản yêu cầu chưa được liên kết Google hợp lệ.",
  REASON_REQUIRED:"Hãy ghi lý do ít nhất 5 ký tự.",
  REVIEW_METHOD_REQUIRED:"Hãy nhập cách đã xác minh thủ công (ít nhất 5 ký tự).",
  INVALID_TRANSITION:"Không thể chuyển từ trạng thái quyền hiện tại.",
  ROLE_CONFLICT:"Tài khoản này đã có quyền quản lý không phù hợp.",
  MANAGER_NOT_FOUND:"Quyền quản lý không còn tồn tại.",
};
const humanError=(code:string)=>errorLabels[code]||"Không thể hoàn tất thao tác. Hãy thử lại.";
const stamp=(value:string|null)=>{
  if(!value)return "—";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"—":date.toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"});
};
const placeHref=(slug:string)=>"/ban-do?place="+encodeURIComponent(slug)+"&detail=1";
async function request(url:string,options?:RequestInit):Promise<unknown>{
  const response=await fetch(url,{cache:"no-store",...options});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error||"REQUEST_FAILED");
  return body;
}
const canReview=(status:ClaimStatus)=>status==="pending"||status==="needs_info"||status==="disputed";

export default function OwnerClaimsApp(){
  const [auth,setAuth]=useState<boolean|null>(null);
  const [filter,setFilter]=useState<Filter>("pending");
  const [page,setPage]=useState(1);
  const [rows,setRows]=useState<Claim[]>([]);
  const [total,setTotal]=useState(0);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [detail,setDetail]=useState<Detail|null>(null);
  const [loading,setLoading]=useState(true);
  const [detailLoading,setDetailLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState<Feedback|null>(null);
  const [note,setNote]=useState("");
  const [reviewMethod,setReviewMethod]=useState("");
  const [managerReason,setManagerReason]=useState("");

  const loadQueue=useCallback(async(signal?:AbortSignal)=>{
    const query=new URLSearchParams({page:String(page)});
    if(filter!=="all")query.set("status",filter);
    try{
      const response=await fetch("/api/admin/ownership-claims?"+query.toString(),{
        cache:"no-store",signal});
      if(response.status===401){if(!signal?.aborted){setAuth(false);setRows([]);setDetail(null);}return;}
      if(!response.ok)throw new Error("QUEUE_UNAVAILABLE");
      const data=await response.json() as {claims:Claim[];total:number};
      if(signal?.aborted)return;
      setAuth(true);
      setRows(Array.isArray(data.claims)?data.claims:[]);
      setTotal(Number(data.total)||0);
    }catch(e){
      if((e as Error).name!=="AbortError"&&!signal?.aborted){
        setFeedback({kind:"error",text:"Không tải được hàng chờ xác minh. Hãy thử làm mới."});
      }
    }finally{
      if(!signal?.aborted)setLoading(false);
    }
  },[filter,page]);
  useEffect(()=>{
    const ctl=new AbortController();
    void Promise.resolve().then(()=>{
      if(!ctl.signal.aborted)return loadQueue(ctl.signal);
    });
    return()=>ctl.abort();
  },[loadQueue]);

  const selected=rows.find(row=>row.id===selectedId)||rows[0]||null;
  const activeDetail=detail?.claim.id===selected?.id?detail:null;
  const loadDetail=useCallback(async(id:string,signal?:AbortSignal)=>{
    try{
      const result=await request("/api/admin/ownership-claims/"+encodeURIComponent(id),
        {signal}) as Detail;
      if(!signal?.aborted)setDetail(result);
    }catch(e){
      if((e as Error).name!=="AbortError"&&!signal?.aborted){
        if((e as Error).message==="UNAUTHORIZED"){setAuth(false);setDetail(null);}
        else setFeedback({kind:"error",text:"Không tải được chi tiết hồ sơ. Vui lòng thử lại."});
      }
    }finally{
      if(!signal?.aborted)setDetailLoading(false);
    }
  },[]);
  useEffect(()=>{
    if(!selected||auth===false)return;
    const ctl=new AbortController();
    void Promise.resolve().then(()=>{
      if(!ctl.signal.aborted){setDetailLoading(true);return loadDetail(selected.id,ctl.signal);}
    });
    return()=>ctl.abort();
  },[selected?.id,auth,loadDetail]);

  async function refresh(){
    setLoading(true);setFeedback(null);setDetail(null);
    await loadQueue();
    if(selected)await loadDetail(selected.id);
  }
  async function decide(action:Action){
    if(!selected||!activeDetail||!canReview(selected.status)||busy)return;
    if(action==="approve"&&reviewMethod.trim().length<5){
      setFeedback({kind:"error",text:errorLabels.REVIEW_METHOD_REQUIRED});return;
    }
    if(action!=="approve"&&note.trim().length<5){
      setFeedback({kind:"error",text:errorLabels.REASON_REQUIRED});return;
    }
    if(action==="approve"&&!window.confirm("Xác nhận đã kiểm tra bằng chứng và cấp quyền CHỦ địa điểm cho tài khoản Google này?"))return;
    if(action==="reject"&&!window.confirm("Từ chối yêu cầu nhận quyền này?"))return;
    setBusy(true);setFeedback(null);
    try{
      await request("/api/admin/ownership-claims/"+encodeURIComponent(selected.id)+"/decision",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,expectedVersion:Number(activeDetail.claim.version),
          note:note.trim(),reviewMethod:reviewMethod.trim()}),
      });
      setFeedback({kind:"success",text:{
        approve:"Đã xác minh và cấp quyền chủ địa điểm.",
        reject:"Đã từ chối yêu cầu và ghi lý do.",
        needs_info:"Đã yêu cầu người gửi bổ sung thông tin.",
        dispute:"Đã đánh dấu tranh chấp. Quyền chủ hiện tại chưa bị chuyển.",
      }[action]});
      setNote("");setReviewMethod("");setSelectedId(null);setDetail(null);
      await loadQueue();
    }catch(e){
      const code=(e as Error).message;
      setFeedback({kind:"error",text:humanError(code)});
      if(code==="UNAUTHORIZED")setAuth(false);
      if(["STALE_VERSION","ALREADY_REVIEWED","OWNER_EXISTS"].includes(code)){
        await loadQueue();
        await loadDetail(selected.id);
      }
    }finally{setBusy(false);}
  }

  async function manage(member:Detail["managers"][number],action:ManagerAction){
    if(!selected||busy||managerReason.trim().length<5){
      setFeedback({kind:"error",text:errorLabels.REASON_REQUIRED});return;
    }
    if(!window.confirm(
      action==="revoke"?"Thu hồi quyền quản lý của "+member.display_name+"?":
      action==="suspend"?"Tạm đình chỉ quyền quản lý của "+member.display_name+"?":
      "Khôi phục quyền quản lý của "+member.display_name+"?"))return;
    setBusy(true);setFeedback(null);
    try{
      await request("/api/admin/place-managers/"+encodeURIComponent(selected.place_id)+"/decision",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,userId:member.user_id,
          expectedVersion:Number(member.version),note:managerReason.trim()}),
      });
      setFeedback({kind:"success",text:action==="revoke"?
        "Đã thu hồi quyền quản lý.":"Đã cập nhật trạng thái quyền quản lý."});
      setManagerReason("");
      await loadDetail(selected.id);
    }catch(e){
      const code=(e as Error).message;
      setFeedback({kind:"error",text:humanError(code)});
      if(code==="UNAUTHORIZED")setAuth(false);
      if(code==="STALE_VERSION")await loadDetail(selected.id);
    }finally{setBusy(false);}
  }

  if(auth===null&&loading)return <main className={styles.gate}>Đang kiểm tra quyền Admin…</main>;
  if(auth===false)return <main className={styles.gate}><section className={styles.gateCard}>
    <ShieldCheck size={36}/><h1>Chỉ Admin được xét duyệt</h1>
    <p>Yêu cầu nhận quyền và bằng chứng chứng minh không công khai.</p>
    <Link href="/admin" className={styles.primary}>Đăng nhập Admin <ArrowRight size={17}/></Link>
  </section></main>;
  if(auth===null)return <main className={styles.gate}><section className={styles.gateCard}>
    <ShieldAlert size={34}/><h1>Chưa thể tải trang xác minh</h1>
    <p>Không đọc được trạng thái phiên Admin. Hãy tải lại hoặc đăng nhập lại.</p>
    <button type="button" className={styles.primary} onClick={()=>void refresh()}>Thử lại</button>
    <Link href="/admin">Về Admin</Link>
  </section></main>;

  return <main className={styles.root}>
    <header className={styles.header}>
      <div><Link href="/admin" className={styles.back}><ArrowLeft size={15}/> Quản lý địa điểm</Link>
        <h1>Xác minh chủ địa điểm</h1>
        <p>11Local · Tài khoản Google · Admin xác minh thủ công</p></div>
      <div className={styles.headerActions}>
        <Link className={styles.secondary} href="/admin/dong-gop">Kiểm duyệt đóng góp</Link>
        <button className={styles.secondary} disabled={busy||loading}
          type="button" onClick={()=>void refresh()}><RefreshCw size={16}/> Làm mới</button>
      </div>
    </header>
    <section className={styles.stats}>
      <div><strong>{total}</strong><span>Hồ sơ theo bộ lọc</span></div>
      <div><strong>{rows.length}</strong><span>Đang hiển thị</span></div>
      <div><strong><ShieldCheck size={25}/></strong><span>Phê duyệt thủ công</span></div>
    </section>
    <nav className={styles.filters} aria-label="Lọc yêu cầu xác minh">
      {filters.map(f=><button type="button" key={f.id} aria-pressed={filter===f.id}
        onClick={()=>{setFilter(f.id);setPage(1);setRows([]);setTotal(0);
          setSelectedId(null);setDetail(null);setLoading(true);setFeedback(null);}}>
        {f.label}</button>)}
    </nav>
    {feedback&&<div role={feedback.kind==="error"?"alert":"status"}
      className={feedback.kind==="error"?styles.error:styles.success}>
      {feedback.kind==="error"?<XCircle size={17}/>:<Check size={17}/>}
      {feedback.text}
    </div>}
    <div className={styles.columns}>
      <aside className={styles.queue}>
        <div className={styles.queueHead}><h2>Hồ sơ xác minh</h2>
          <small>{loading?"Đang tải…":rows.length?("Trang "+page):"Không có yêu cầu"}</small></div>
        {!loading&&!rows.length&&<div className={styles.empty}>
          <FileSearch size={30}/><p>Chưa có hồ sơ ở trạng thái này.</p></div>}
        {rows.map(row=><button key={row.id} type="button" className={styles.queueItem}
          data-selected={selected?.id===row.id}
          onClick={()=>{setSelectedId(row.id);setDetail(null);
            setNote("");setReviewMethod("");setManagerReason("");setFeedback(null);}}>
          <strong>{row.place_name}</strong>
          <span><UserRound size={13}/>{row.claimant_name||row.display_name}</span>
          <span><Clock3 size={13}/>{stamp(row.created_at)}</span>
          <em data-status={row.status}>{statusLabels[row.status]||row.status}</em>
        </button>)}
        {total>30&&<div className={styles.pages}>
          <button type="button" aria-label="Trang trước" disabled={page===1||loading}
            onClick={()=>{setPage(page-1);setLoading(true);setRows([]);setSelectedId(null);setDetail(null);}}>
            <ChevronLeft size={17}/></button>
          <span>{page}/{Math.ceil(total/30)}</span>
          <button type="button" aria-label="Trang sau"
            disabled={page*30>=total||loading}
            onClick={()=>{setPage(page+1);setLoading(true);setRows([]);setSelectedId(null);setDetail(null);}}>
            <ChevronRight size={17}/></button>
        </div>}
      </aside>
      <section className={styles.detail}>
        {!selected?<div className={styles.blank}><ShieldCheck size={40}/><h2>Chọn một yêu cầu</h2>
          <p>Hồ sơ mới sẽ xuất hiện tại đây sau khi người dùng Google gửi yêu cầu.</p></div>
        :detailLoading&&!activeDetail?<div className={styles.blank} role="status">Đang tải chi tiết hồ sơ…</div>
        :!activeDetail?<div className={styles.blank}><ShieldAlert size={30}/>
          <h2>Không đọc được hồ sơ</h2>
          <button type="button" className={styles.secondary} onClick={()=>void loadDetail(selected.id)}>Thử lại</button></div>
        :<div className={styles.details}>
          <div className={styles.placeTitle}>
            <div><span className={styles.overline}><Store size={14}/> Hồ sơ nhận quyền quản lý</span>
              <h2>{activeDetail.claim.place_name}</h2>
              <p><span>{activeDetail.claim.address||"Cao Bằng"}</span> · {stamp(activeDetail.claim.created_at)}</p></div>
            <Link href={placeHref(activeDetail.claim.slug)} target="_blank"
              rel="noopener noreferrer" className={styles.viewPlace}>Xem địa điểm <ExternalLink size={14}/></Link>
          </div>
          <div className={styles.statusRow}>
            <em data-status={activeDetail.claim.status}>{statusLabels[activeDetail.claim.status]}</em>
            <small>Phiên bản #{activeDetail.claim.version}</small>
          </div>
          <section className={styles.section}>
            <h3><UserRound size={17}/> Người gửi yêu cầu</h3>
            <div className={styles.factGrid}>
              <div><small>Họ tên khai báo</small><strong>{activeDetail.claim.claimant_name}</strong></div>
              <div><small>Tài khoản Google</small><strong>{activeDetail.claim.email}</strong></div>
              <div><small>Vai trò đề nghị</small><strong>{activeDetail.claim.relationship==="owner"?"Chủ địa điểm":"Được ủy quyền"}</strong></div>
              <div><small>Điện thoại liên hệ</small>
                <a href={"tel:"+activeDetail.claim.contact_phone}><Phone size={15}/>{activeDetail.claim.contact_phone}</a></div>
            </div>
          </section>
          <section className={styles.section}>
            <h3><FileSearch size={17}/> Thông tin chứng minh</h3>
            <p className={styles.statement}>{activeDetail.claim.evidence?.statement||"Người gửi chưa ghi mô tả."}</p>
            <div className={styles.photoGrid}>
              {activeDetail.photos.map(photo=><a key={photo.id}
                href={"/api/admin/ownership-claims/"+activeDetail.claim.id+"/evidence/"+photo.id}
                target="_blank" rel="noopener noreferrer" title="Xem ảnh chứng minh riêng tư">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={"/api/admin/ownership-claims/"+activeDetail.claim.id+"/evidence/"+photo.id}
                  alt="Ảnh chứng minh chỉ Admin xem" loading="lazy"/>
                <span>Xem ảnh <ExternalLink size={12}/></span>
              </a>)}
              {activeDetail.photos.length===0&&<p className={styles.muted}><ImageIcon size={17}/> Chưa có ảnh chứng minh.</p>}
            </div>
            <div className={styles.privacy}><LockKeyhole size={16}/>
              Ảnh bằng chứng không được công khai lên thư viện địa điểm.</div>
          </section>
          {activeDetail.messages.length>0&&<section className={styles.section}>
            <h3><Clock3 size={17}/> Lịch sử trao đổi</h3>
            {activeDetail.messages.map(m=><div className={styles.message} data-sender={m.sender} key={m.id}>
              <div><strong>{m.sender==="admin"?"Admin":"Người yêu cầu"}</strong><small>{stamp(m.created_at)}</small></div>
              <p>{m.body}</p></div>)}
          </section>}
          {activeDetail.managers.length>0&&<section className={styles.section}>
            <h3><Users size={17}/> Quyền quản lý hiện tại</h3>
            <p className={styles.muted}>Nếu đã có chủ đang hoạt động, cần xác minh và thu hồi/đình chỉ đúng quy trình trước khi cấp chủ mới.</p>
            <label className={styles.field}>Lý do cập nhật quyền (ít nhất 5 ký tự)
              <textarea rows={2} maxLength={1000} value={managerReason}
                onChange={e=>setManagerReason(e.target.value)}
                placeholder="Ví dụ: Đã xác minh tranh chấp qua cuộc gọi…"/>
            </label>
            {activeDetail.managers.map(member=><div className={styles.member} key={member.user_id}>
              <div><strong>{member.display_name||member.email}</strong>
                <small>{member.email} · {member.role==="owner"?"Chủ":"Người quản lý"}</small>
                <em data-status={member.status}>{member.status==="active"?"Đang hoạt động":
                  member.status==="suspended"?"Tạm khóa":"Đã thu hồi"}</em>
              </div>
              <div className={styles.memberActions}>
                {member.status==="active"&&<button type="button" disabled={busy||managerReason.trim().length<5}
                  onClick={()=>void manage(member,"suspend")}>Tạm khóa</button>}
                {member.status==="suspended"&&<button type="button" disabled={busy||managerReason.trim().length<5}
                  onClick={()=>void manage(member,"resume")}>Khôi phục</button>}
                {member.status!=="revoked"&&<button type="button" disabled={busy||managerReason.trim().length<5}
                  onClick={()=>void manage(member,"revoke")}>Thu hồi</button>}
              </div>
            </div>)}
          </section>}
          {activeDetail.claim.decision_note&&<section className={styles.section}>
            <h3><ShieldCheck size={17}/> Kết quả xác minh trước đó</h3>
            <p className={styles.statement}>{activeDetail.claim.decision_note}</p>
            {activeDetail.claim.review_method&&<p className={styles.muted}>
              Cách đối chiếu: {activeDetail.claim.review_method}</p>}
          </section>}
          {canReview(activeDetail.claim.status)?<section className={styles.decision}>
            <h3><ShieldCheck size={19}/> Quyết định của Admin</h3>
            <p>Mọi thao tác được ghi audit log; đăng nhập Google không tự cấp quyền.</p>
            <label className={styles.field}>Phương pháp xác minh khi duyệt *
              <input type="text" maxLength={100} value={reviewMethod}
                onChange={e=>setReviewMethod(e.target.value)}
                placeholder="Ví dụ: Đã gọi xác minh số liên hệ quán"/>
              <small>Ít nhất 5 ký tự. Bắt buộc trước khi duyệt cấp quyền chủ.</small>
            </label>
            <label className={styles.field}>Ghi chú / lý do
              <textarea rows={3} maxLength={1000} value={note}
                onChange={e=>setNote(e.target.value)}
                placeholder="Bắt buộc khi yêu cầu bổ sung, từ chối hoặc đánh dấu tranh chấp…"/>
            </label>
            <div className={styles.actions}>
              <button type="button" className={styles.approve}
                disabled={busy||detailLoading||reviewMethod.trim().length<5}
                onClick={()=>void decide("approve")}><BadgeCheck size={16}/> Xác minh & cấp quyền</button>
              <button type="button" className={styles.info}
                disabled={busy||detailLoading||note.trim().length<5}
                onClick={()=>void decide("needs_info")}>Cần bổ sung</button>
              <button type="button" className={styles.warning}
                disabled={busy||detailLoading||note.trim().length<5}
                onClick={()=>void decide("dispute")}><ShieldAlert size={16}/> Tranh chấp</button>
              <button type="button" className={styles.reject}
                disabled={busy||detailLoading||note.trim().length<5}
                onClick={()=>void decide("reject")}><XCircle size={16}/> Từ chối</button>
            </div>
          </section>:<div className={styles.completed}>
            <ShieldCheck size={19}/> Hồ sơ đã xử lý. Không thể duyệt lại cùng phiên bản.
          </div>}
        </div>}
      </section>
    </div>
  </main>;
}
