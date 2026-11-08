"use client";
import {useEffect,useMemo,useState} from "react";

type User={id:string;display_name:string;email:string|null;status:"pending"|"approved"|"rejected"|"blocked";created_at:string;last_login_at:string|null;note:string|null};
const labels={pending:"Chờ duyệt",approved:"Đã duyệt",rejected:"Từ chối",blocked:"Đã khóa"};
export function AdminUsers(){
  const [users,setUsers]=useState<User[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState("all");
  async function refresh(){
    try{
      const r=await fetch("/api/admin/users",{cache:"no-store"});
      if(!r.ok)throw Error("Không tải được tài khoản");
      const data=await r.json();setUsers(data.users);
    }catch{setMessage("Không thể tải danh sách thành viên.");}finally{setLoading(false);}
  }
  useEffect(()=>{
    let active=true;
    fetch("/api/admin/users",{cache:"no-store"})
      .then(r=>{if(!r.ok)throw Error();return r.json();})
      .then(data=>{if(active)setUsers(data.users);})
      .catch(()=>{if(active)setMessage("Không thể tải danh sách thành viên.");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  const items=useMemo(()=>users.filter(u=>(filter==="all"||u.status===filter)&&
    (u.display_name+" "+(u.email||"")).toLocaleLowerCase().includes(search.toLocaleLowerCase())),[users,filter,search]);
  async function decide(user:User,status:User["status"]){
    const message=status==="blocked"?"Khóa tài khoản này và thu hồi quyền đóng góp ngay?":status==="rejected"?"Từ chối tài khoản này?":"Xác nhận thay đổi trạng thái tài khoản?";
    if(!window.confirm(message))return;
    setBusy(user.id);setMessage("");
    try{
      const r=await fetch("/api/admin/users/"+user.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
      if(!r.ok)throw Error("Không cập nhật được tài khoản");
      await refresh();setMessage("Đã cập nhật "+(user.email||user.display_name)+": "+labels[status]);
    }catch{setMessage("Không thể cập nhật tài khoản.");}finally{setBusy(null);}
  }
  return <section className="panel" id="quan-ly-tai-khoan">
    <h2>Quản lý tài khoản Google</h2>
    <p>Chỉ tài khoản được duyệt mới có quyền đăng ảnh. Tài khoản mới mặc định chờ duyệt.</p>
    <div className="empty-actions">
      <label className="field">Tìm thành viên<input placeholder="Tên hoặc email Google" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <label className="field">Trạng thái<select value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="all">Tất cả</option>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
      </select></label>
      <button type="button" className="secondary" onClick={()=>void refresh()}>Tải lại</button>
    </div>
    {loading?<p>Đang tải tài khoản…</p>:items.length===0?<p>Không có tài khoản phù hợp.</p>:items.map(u=><div className="map-place" key={u.id}>
      <strong>{u.display_name||"Thành viên"} · {labels[u.status]}</strong>
      <small>{u.email||"Chưa có email"} · Đăng ký: {u.created_at?.slice(0,10)}</small>
      <div className="empty-actions">
        {u.status!=="approved"&&<button type="button" disabled={busy===u.id} className="primary" onClick={()=>void decide(u,"approved")}>Duyệt</button>}
        {u.status!=="rejected"&&<button type="button" disabled={busy===u.id} className="secondary" onClick={()=>void decide(u,"rejected")}>Từ chối</button>}
        {u.status!=="blocked"&&<button type="button" disabled={busy===u.id} className="secondary" onClick={()=>void decide(u,"blocked")}>Khóa</button>}
      </div>
    </div>)}
    {message&&<p role="status" className="status">{message}</p>}
  </section>;
}
