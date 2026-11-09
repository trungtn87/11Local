"use client";
import {useState} from "react";
export function UploadForm({albums,selected}:{albums:{id:string;title:string}[];selected?:string}){
 const [files,setFiles]=useState<File[]>([]),[albumId,setAlbumId]=useState(selected||albums[0]?.id||""),[caption,setCaption]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();if(!albumId||!files.length)return;setBusy(true);setMessage("");let uploaded=0;let error="";
 for(const file of files){const data=new FormData();data.set("album_id",albumId);data.set("caption",caption);data.set("image",file);try{const r=await fetch("/api/photos",{method:"POST",body:data});const body=await r.json();if(!r.ok){error=body.error||"Không tải được ảnh";break;}uploaded++;}catch{error="Không thể kết nối máy chủ";break;}}
 setBusy(false);
 // Only remove successfully uploaded files; keep the failed file and every
 // unattempted photo for an easy retry, and never overwrite the error.
 if(uploaded)setFiles(current=>current.slice(uploaded));
 setMessage((uploaded?("Đã đăng "+uploaded+" ảnh vào album. "):"")+(error?("Không gửi được ảnh còn lại: "+error):""));
 }
 return <form className="panel" onSubmit={submit}><h2>Đăng ảnh kỷ niệm</h2><label className="field">Chọn album<select value={albumId} onChange={e=>setAlbumId(e.target.value)} required>{albums.map(a=><option value={a.id} key={a.id}>{a.title}</option>)}</select></label><label className="field">Chọn ảnh (tối đa 10 ảnh/lần)<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,10))}/></label>{files.length>0&&<p>{files.length} ảnh được chọn</p>}<label className="field">Ghi chú<textarea maxLength={500} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Kỷ niệm của Gấu…"/></label><p>Ảnh tự thu nhỏ tối đa 2048px, lưu bản sao WebP. Ảnh gốc vẫn ở thiết bị của bạn.</p><button disabled={busy||!files.length||!albumId} className="primary">{busy?"Đang tải ảnh…":"Đăng ảnh vào album"}</button>{message&&<p role="status" className="status">{message}</p>}</form>;
}
