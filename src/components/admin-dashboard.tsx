"use client";
import {useState} from "react";
import {AdminContentManager} from "./admin-content-manager";
type A={id:string;title:string};
type P={id:string;caption:string;album_title:string;uploader:string};
export function AdminDashboard({authenticated,pending,approved}:{authenticated:boolean;albums:A[];pending:P[];approved:P[]}){
 const [password,setPassword]=useState(""),[msg,setMsg]=useState("");
 async function login(e:React.FormEvent){e.preventDefault();const r=await fetch("/api/admin/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});if(r.ok)location.reload();else setMsg("Sai mật khẩu quản trị.");}
 async function decide(id:string,status:string){
  const r=await fetch("/api/admin/photos/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
  if(r.ok)location.reload();else setMsg("Không cập nhật được ảnh");
 }
 if(!authenticated)return <form className="panel" onSubmit={login}><label className="field">Mật khẩu Admin<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary">Đăng nhập</button><p role="status">{msg}</p></form>;
 return <div className="admin-columns">
  <AdminContentManager/>
  <section className="panel"><h2>Ảnh chờ duyệt ({pending.length})</h2>{pending.length?pending.map(p=><div className="map-place" key={p.id}>
   <img src={"/api/photos/"+p.id} alt="Ảnh chờ duyệt" style={{width:120,borderRadius:12}}/>
   <strong>{p.album_title}</strong><small>{p.uploader} · {p.caption}</small>
   <div className="empty-actions"><button type="button" className="primary" onClick={()=>void decide(p.id,"approved")}>Duyệt</button><button type="button" className="secondary" onClick={()=>void decide(p.id,"rejected")}>Từ chối</button></div>
  </div>):<p>Không có ảnh chờ duyệt.</p>}</section>
  <section className="panel"><h2>Ảnh công khai gần đây ({approved.length})</h2><p>Có thể ẩn ảnh đã duyệt nhầm hoặc được yêu cầu gỡ.</p>
  {approved.length?approved.map(p=><div className="map-place" key={p.id}>
   <img src={"/api/photos/"+p.id} alt="Ảnh công khai" style={{width:120,borderRadius:12}}/><strong>{p.album_title}</strong><small>{p.uploader} · {p.caption}</small>
   <button type="button" className="secondary" onClick={()=>void decide(p.id,"rejected")}>Ẩn ảnh khỏi trang công khai</button>
  </div>):<p>Chưa có ảnh công khai.</p>}</section>
  {msg&&<p role="status" className="status">{msg}</p>}
 </div>;
}
