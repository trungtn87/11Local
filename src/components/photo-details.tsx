"use client";

import {useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {horizontalSwipe} from "@/lib/photo-navigation";
import styles from "./photo-details.module.css";

type Comment = {id:string;body:string;created_at:string;author_id:string;author_name:string};
export function PhotoDetails({id,title:initialTitle,caption:initialCaption,canEdit,canComment,userId,admin,backHref,backLabel,position,total,previousHref,nextHref,uploaderName,takenOn,placeTitle,milestoneTitle}:{id:string;title:string;caption:string;canEdit:boolean;canComment:boolean;userId:string|null;admin:boolean;backHref:string;backLabel:string;position:number;total:number;previousHref:string|null;nextHref:string|null;uploaderName:string;takenOn:string|null;placeTitle:string|null;milestoneTitle:string|null}) {
  const router=useRouter();
  const touchStart=useRef<{x:number;y:number}|null>(null);
  const [title,setTitle]=useState(initialTitle),[caption,setCaption]=useState(initialCaption);
  const [editing,setEditing]=useState(false),[saving,setSaving]=useState(false);
  const [comments,setComments]=useState<Comment[]>([]);
  const [body,setBody]=useState(""),[posting,setPosting]=useState(false),[error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;
    fetch(`/api/photos/${id}/comments`,{cache:"no-store"})
      .then(async r=>{if(!r.ok)throw Error("Không tải được bình luận");return r.json();})
      .then(data=>{if(active)setComments(data.comments||[]);})
      .catch(()=>{if(active)setError("Không tải được bình luận");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[id]);
  useEffect(()=>{
    function onKeyDown(event:KeyboardEvent) {
      if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
      const target=event.target as HTMLElement|null;
      if(target?.isContentEditable||target?.closest("input, textarea, select, [contenteditable='true']"))return;
      const href=event.key==="ArrowLeft"?previousHref:event.key==="ArrowRight"?nextHref:null;
      if(href){event.preventDefault();router.push(href,{scroll:false});}
    }
    window.addEventListener("keydown",onKeyDown);
    return ()=>window.removeEventListener("keydown",onKeyDown);
  },[previousHref,nextHref,router]);
  async function save(event:FormEvent) {
    event.preventDefault();setSaving(true);setError("");
    try {
      const r=await fetch(`/api/photos/${id}/details`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,caption})});
      const data=await r.json();
      if(!r.ok)throw Error(data.error||"Không thể lưu ảnh");
      setEditing(false);
    }catch(e){setError(e instanceof Error?e.message:"Không thể lưu");}
    finally{setSaving(false);}
  }
  async function post(event:FormEvent) {
    event.preventDefault();if(!body.trim())return;setPosting(true);setError("");
    try {
      const r=await fetch(`/api/photos/${id}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body})});
      const data=await r.json();if(!r.ok)throw Error(data.error||"Không thể bình luận");
      setComments(list=>[...list,data.comment]);setBody("");
    }catch(e){setError(e instanceof Error?e.message:"Không thể gửi bình luận");}
    finally{setPosting(false);}
  }
  async function remove(commentId:string) {
    setError("");
    try {
      const r=await fetch(`/api/photos/${id}/comments/${commentId}`,{method:"DELETE"});
      if(!r.ok){const data=await r.json();throw Error(data.error||"Không thể xóa");}
      setComments(list=>list.filter(c=>c.id!==commentId));
    }catch(e){setError(e instanceof Error?e.message:"Không thể xóa bình luận");}
  }
  return <div className="wrap" style={{maxWidth:900,paddingBottom:48}}>
    <p><Link href={backHref}>← {backLabel}</Link></p>
    <div className={styles.viewer}
      aria-label="Trình xem ảnh kỷ niệm"
      onTouchStart={event=>{
        const point=event.touches.length===1?event.touches[0]:null;
        touchStart.current=point?{x:point.clientX,y:point.clientY}:null;
      }}
      onTouchEnd={event=>{
        const start=touchStart.current;
        touchStart.current=null;
        const end=event.changedTouches[0];
        if(!start||!end)return;
        const direction=horizontalSwipe(start,{x:end.clientX,y:end.clientY});
        const href=direction==="previous"?previousHref:direction==="next"?nextHref:null;
        if(href)router.push(href,{scroll:false});
      }}
      onTouchCancel={()=>{touchStart.current=null;}}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/photos/${id}`} alt={title||"Ảnh kỷ niệm"} draggable={false}/>
      {previousHref&&<Link className={styles.previous} href={previousHref} scroll={false} prefetch={false} aria-label="Xem ảnh trước">‹</Link>}
      {nextHref&&<Link className={styles.next} href={nextHref} scroll={false} prefetch={false} aria-label="Xem ảnh tiếp theo">›</Link>}
    </div>
    <div className={styles.counter} aria-live="polite">
      <strong>Ảnh {position} / {total}</strong>
      {total>1&&<span>Vuốt trái/phải để chuyển ảnh · Máy tính dùng phím ← →</span>}
    </div>
    {editing?<form onSubmit={save}>
      <label className="field">Tên ảnh<input value={title} maxLength={150} onChange={e=>setTitle(e.target.value)}/></label>
      <label className="field">Câu chuyện của ảnh<textarea value={caption} maxLength={2000} onChange={e=>setCaption(e.target.value)}/></label>
      <button className="primary" disabled={saving}>{saving?"Đang lưu…":"Lưu thông tin"}</button>
      <button type="button" className="secondary" onClick={()=>setEditing(false)}>Hủy</button>
    </form>:<section>
      <h1>{title||"Ảnh kỷ niệm"}</h1>
      {caption&&<p style={{whiteSpace:"pre-wrap"}}>{caption}</p>}
      {canEdit&&<button className="secondary" onClick={()=>setEditing(true)}>Sửa thông tin ảnh</button>}
    </section>}
    <div className={styles.meta}>
      <span>Đăng bởi {uploaderName}</span>
      {takenOn&&<span>📅 {takenOn}</span>}
      {placeTitle&&<span>📍 {placeTitle}</span>}
      {milestoneTitle&&<span>🌱 {milestoneTitle}</span>}
    </div>
    <section style={{marginTop:28}}>
      <h2>Bình luận ({comments.length})</h2>
      {loading?<p>Đang tải bình luận…</p>:comments.length===0?<p>Chưa có lời nhắn nào cho bức ảnh này.</p>:null}
      {comments.map(comment=><article key={comment.id} style={{borderBottom:"1px solid #ddd",padding:"12px 0"}}>
        <strong>{comment.author_name}</strong> <small>{new Date(comment.created_at).toLocaleString("vi-VN")}</small>
        <p style={{whiteSpace:"pre-wrap"}}>{comment.body}</p>
        {(admin||userId===comment.author_id)&&<button type="button" className="secondary" onClick={()=>void remove(comment.id)}>Xóa bình luận</button>}
      </article>)}
      {canComment?<form onSubmit={post} style={{marginTop:16}}>
        <label className="field">Viết bình luận cho ảnh này<textarea required maxLength={2000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Chia sẻ một kỷ niệm…"/></label>
        <button className="primary" disabled={posting||!body.trim()}>{posting?"Đang gửi…":"Gửi bình luận"}</button>
      </form>:<p>Đăng nhập bằng tài khoản Google đã được duyệt để bình luận.</p>}
      {error&&<p role="alert">{error}</p>}
    </section>
  </div>;
}
