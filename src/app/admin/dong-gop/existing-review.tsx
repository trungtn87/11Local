
"use client";
import {useState} from "react";
import Link from "next/link";
import {Camera,Check,ExternalLink,ShieldCheck,XCircle} from "lucide-react";
import styles from "./review.module.css";
export type ExistingDetail={
  contribution:{id:string;kind:string;tracking_code:string;moderation_status:string;
    payload:Record<string,unknown>;decision_note:string|null;version:number;created_at:string};
  existingPlace:Record<string,unknown>|null;
  publishedPlace:{slug:string;name:string}|null;
  photos:{id:string;sort_order:number;is_cover:boolean;published:boolean}[];
  messages:{sender:string;body:string;created_at:string}[];
};
const kinds:Record<string,string>={report:"Báo sai",edit_place:"Đề xuất sửa thông tin",photo:"Gửi ảnh"};
const fields:Record<string,string>={name:"Tên",address:"Địa chỉ",area:"Khu vực",description:"Mô tả",
  summary:"Giới thiệu ngắn",phone:"Số điện thoại",opening_hours:"Giờ mở cửa",
  website_url:"Website",price_note:"Giá tham khảo"};
const reasons:Record<string,string>={closed:"Ngừng hoạt động",wrong_location:"Vị trí sai",
  duplicate:"Trùng địa điểm",incorrect:"Thông tin sai",other:"Khác"};
const show=(v:unknown)=>v===null||v===undefined||v===""?"(chưa có)":String(v);
export default function ExistingReview({detail,onComplete}:{
  detail:ExistingDetail;onComplete:(message:string)=>void
}){
  const c=detail.contribution,p=c.payload;
  const [note,setNote]=useState(c.decision_note||"");
  const [selected,setSelected]=useState(detail.photos.map(x=>x.id));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const canReview=["pending","needs_info"].includes(c.moderation_status);
  const field=String(p.fieldKey||"");
  const stale=c.kind==="edit_place"&&Number(detail.existingPlace?.version)!==Number(p.baseVersion);
  const decide=async(action:"approve"|"reject"|"needs_info")=>{
    if(!canReview||busy)return;
    if(action!=="approve"&&note.trim().length<5){setError("Cần ghi lý do từ 5 ký tự.");return;}
    if(action==="approve"&&c.kind==="photo"&&!selected.length){setError("Chọn ít nhất 1 ảnh.");return;}
    if(action==="approve"&&stale){setError("Dữ liệu địa điểm đã thay đổi, không được ghi đè.");return;}
    if(action==="approve"&&!window.confirm(c.kind==="report"
      ?"Xác nhận đã xử lý? Báo sai không tự động ẩn hay sửa địa điểm."
      :c.kind==="edit_place"?"Áp dụng thay đổi lên địa điểm đã công khai?"
      :"Công khai các ảnh đã chọn?"))return;
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/admin/contributions/"+c.id+"/existing-decision",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,note,expectedVersion:c.version,
          ...(action==="approve"&&c.kind==="photo"?{approvedPhotoIds:selected}:{})}),
      });
      const body=await r.json();
      if(!r.ok)throw Error(body.error||"REVIEW_FAILED");
      onComplete(action==="needs_info"?"Đã yêu cầu bổ sung.":action==="reject"?"Đã từ chối.":
        c.kind==="report"?"Đã xác nhận báo cáo, chưa tự sửa địa điểm.":
        c.kind==="edit_place"?"Đã cập nhật thông tin địa điểm.":"Đã công khai ảnh được duyệt.");
    }catch(e){const code=(e as Error).message;
      setError(({STALE_PLACE:"Địa điểm vừa được cập nhật. Cần người gửi đề xuất lại.",
        STALE_VERSION:"Hồ sơ vừa thay đổi, hãy mở lại.",PLACE_NOT_PUBLIC:"Địa điểm không còn công khai.",
        INVALID_PHOTO_SELECTION:"Chọn lại ảnh được duyệt."} as Record<string,string>)[code]||"Lỗi: "+code);
    }finally{setBusy(false);}
  };
  return <div className={styles.editor}>
    <div className={styles.editorHeading}><div>
      <span className={styles.code}>{c.tracking_code}</span>
      <h2>{kinds[c.kind]} · {show(p.placeName)}</h2>
      <p>{new Date(c.created_at).toLocaleString("vi-VN")} · {c.moderation_status}</p>
    </div>
    {detail.publishedPlace&&<Link className={styles.external} href={"/dia-diem/"+detail.publishedPlace.slug} target="_blank">
      Xem địa điểm <ExternalLink size={14}/></Link>}</div>
    <section className={styles.form}>
      {c.kind==="report"&&<p><strong>Lý do:</strong> {reasons[String(p.reason)]||show(p.reason)}</p>}
      {c.kind==="edit_place"&&<div className={styles.contact}>
        <h3>{fields[field]||field}</h3>
        <p><strong>Hiện tại:</strong> {show(detail.existingPlace?.[field])}</p>
        <p><strong>Đề xuất:</strong> {show(p.proposedValue)}</p>
        <p className={styles.hint}>Phiên bản hiện tại {show(detail.existingPlace?.version)} · Lúc gửi {show(p.baseVersion)}</p>
        {stale&&<p className={styles.alert}>Đề xuất đã cũ. Cần đối chiếu trước khi xử lý.</p>}
      </div>}
      <div className={styles.contact}><h3>Thông tin người gửi</h3>
        <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{show(p.note)}</p></div>
      {c.kind==="photo"&&<div className={styles.photoSection}>
        <h3><Camera size={17}/> Ảnh cộng đồng ({detail.photos.length})</h3>
        <p>Chọn ảnh được công khai. Không thay ảnh bìa hiện có.</p>
        <div className={styles.photos}>{detail.photos.map(ph=><div key={ph.id} className={styles.photo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={"/api/admin/contributions/"+c.id+"/photos/"+ph.id} alt="Ảnh chờ duyệt"/>
          <label><input type="checkbox" disabled={!canReview} checked={selected.includes(ph.id)}
            onChange={e=>setSelected(old=>e.target.checked?[...old,ph.id]:old.filter(x=>x!==ph.id))}/> Duyệt ảnh</label>
        </div>)}</div></div>}
      {c.kind==="report"&&<p className={styles.hint}>Việc xác nhận báo sai không tự động thay đổi địa điểm; Admin sửa hoặc ẩn riêng sau khi xác minh.</p>}
    </section>
    {detail.messages?.length>0&&<section className={styles.contact}><h3>Trao đổi với người gửi</h3>
      {detail.messages.map((m,i)=><div key={i} style={{padding:"9px 0",borderBottom:"1px solid #deebe2"}}>
        <strong>{m.sender==="admin"?"Admin":"Người gửi"}</strong>
        <small> · {new Date(m.created_at).toLocaleString("vi-VN")}</small>
        <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{m.body}</p>
      </div>)}</section>}
    {canReview?<section className={styles.decisions}>
      <h3>Quyết định kiểm duyệt</h3>
      <label className={styles.field}>Ghi chú / lý do
        <textarea rows={3} maxLength={1200} value={note}
          onChange={e=>setNote(e.target.value)} placeholder="Bắt buộc khi từ chối hoặc yêu cầu bổ sung."/>
      </label>
      {error&&<p className={styles.alert} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.approve} disabled={busy||stale} onClick={()=>void decide("approve")}>
          <Check size={18}/>{c.kind==="report"?"Đã xử lý báo cáo":c.kind==="photo"?"Duyệt ảnh":"Duyệt & áp dụng"}</button>
        <button type="button" className={styles.info} disabled={busy} onClick={()=>void decide("needs_info")}>Cần bổ sung</button>
        <button type="button" className={styles.reject} disabled={busy} onClick={()=>void decide("reject")}><XCircle size={17}/> Từ chối</button>
      </div>
    </section>:<div className={styles.completed}><ShieldCheck size={18}/>
      Hồ sơ đã xử lý. {c.decision_note||""}</div>}
  </div>;
}
