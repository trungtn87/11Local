"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
type Type="album"|"place"|"milestone";
type Row={id:string;title:string;description?:string;details?:string;event_date?:string|null;visited_on?:string|null;
  latitude?:number;longitude?:number;album_id?:string|null;archived_at?:string|null;photo_count?:number};
type Data={albums:Row[];places:Row[];milestones:Row[]};
const labels:Record<Type,string>={album:"Album",place:"Địa điểm",milestone:"Cột mốc"};
const keys:Record<Type,keyof Data>={album:"albums",place:"places",milestone:"milestones"};
const empty=()=>({title:"",description:"",details:"",event_date:"",visited_on:"",latitude:"",longitude:"",album_id:""});
export function AdminContentManager(){
  const [data,setData]=useState<Data>({albums:[],places:[],milestones:[]});
  const [tab,setTab]=useState<Type>("album");
  const [item,setItem]=useState<Row|null>(null);
  const [values,setValues]=useState<Record<string,string>>(empty);
  const [search,setSearch]=useState("");
  const [showArchived,setShowArchived]=useState(false);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
  const refresh=useCallback(async()=>{
    try{
      const r=await fetch("/api/admin/family",{cache:"no-store"});if(!r.ok)throw Error();
      const v=await r.json();setData(v);
    }catch{setMessage("Không thể tải danh sách quản trị.");}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const rows=useMemo(()=>data[keys[tab]].filter(r=>(tab!=="album"||showArchived||!r.archived_at)&&r.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())),[data,tab,search,showArchived]);
  function open(row:Row|null){setItem(row);setValues(row?{
    title:row.title,description:row.description||"",details:row.details||"",
    event_date:row.event_date||"",visited_on:row.visited_on||"",
    latitude:row.latitude===undefined?"":String(row.latitude),
    longitude:row.longitude===undefined?"":String(row.longitude),album_id:row.album_id||""
  }:empty());setMessage("");}
  function switchTab(next:Type){setTab(next);open(null);setSearch("");}
  const set=(key:string,value:string)=>setValues(v=>({...v,[key]:value}));
  async function submit(event:React.FormEvent){
    event.preventDefault();setBusy(true);setMessage("");
    try{
      const r=await fetch("/api/admin/family",{method:item?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:tab,...values,...(item?{id:item.id}:{})})});
      const body=await r.json();
      if(!r.ok)throw Error(body.error||"Không lưu được");
      await refresh();open(null);setMessage(item?"Đã cập nhật nội dung.":"Đã tạo nội dung mới.");
    }catch(error){setMessage(error instanceof Error?error.message:"Không thể lưu.");}finally{setBusy(false);}
  }
  async function remove(row:Row){
    const caption=tab==="album"?"Lưu trữ album này? Ảnh được giữ nguyên, có thể khôi phục sau.":"Xóa vĩnh viễn "+labels[tab].toLocaleLowerCase()+" này?";
    if(!window.confirm(caption))return;
    setBusy(true);setMessage("");
    try{
      const r=await fetch("/api/admin/family",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:tab,id:row.id})});
      const body=await r.json();if(!r.ok)throw Error(body.error||"Không xóa được");
      await refresh();if(item?.id===row.id)open(null);setMessage(tab==="album"?"Đã lưu trữ album (giữ nguyên ảnh).":"Đã xóa.");
    }catch(error){setMessage(error instanceof Error?error.message:"Không xóa được.");}finally{setBusy(false);}
  }
  async function restore(row:Row){
    setBusy(true);try{
      const r=await fetch("/api/admin/family",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"album",id:row.id,restore:true})});
      if(!r.ok)throw Error();await refresh();setMessage("Đã khôi phục album.");
    }catch{setMessage("Không thể khôi phục album.");}finally{setBusy(false);}
  }
  return <section className="panel" id="quan-ly-noi-dung">
    <h2>Quản lý kỷ niệm</h2><p>Thêm mới, chỉnh sửa, lưu trữ và xóa dữ liệu của Nhà của Gấu.</p>
    <div className="empty-actions">{(["album","place","milestone"] as Type[]).map(t=>
      <button key={t} type="button" className={tab===t?"primary":"secondary"} onClick={()=>switchTab(t)}>{labels[t]} ({data[keys[t]].length})</button>)}</div>
    <div className="empty-actions">
      <label className="field">Tìm {labels[tab].toLocaleLowerCase()}<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nhập tên để tìm…"/></label>
      {tab==="album"&&<label className="field">Hiển thị album lưu trữ<select value={showArchived?"yes":"no"} onChange={e=>setShowArchived(e.target.value==="yes")}><option value="no">Đang hoạt động</option><option value="yes">Tất cả</option></select></label>}
      <button type="button" className="secondary" onClick={()=>open(null)}>+ Thêm {labels[tab].toLocaleLowerCase()}</button>
    </div>
    {loading?<p>Đang tải…</p>:rows.length?rows.map(row=><div className="map-place" key={row.id}>
      <strong>{row.title} {row.archived_at?"(Đã lưu trữ)":""}</strong>
      <small>{row.event_date||row.visited_on||""}{tab==="album"?" · "+(row.photo_count||0)+" ảnh":""}</small>
      <div className="empty-actions">
        <button type="button" className="secondary" onClick={()=>open(row)}>Sửa</button>
        {row.archived_at?<button type="button" disabled={busy} className="secondary" onClick={()=>void restore(row)}>Khôi phục</button>:
          <button type="button" disabled={busy} className="secondary" onClick={()=>void remove(row)}>{tab==="album"?"Lưu trữ":"Xóa"}</button>}
      </div>
    </div>):<p>Chưa có dữ liệu phù hợp.</p>}
    <form onSubmit={submit}>
      <h3>{item?"Chỉnh sửa ":"Thêm "}{labels[tab].toLocaleLowerCase()}</h3>
      <label className="field">Tên <input value={values.title} maxLength={150} required onChange={e=>set("title",e.target.value)}/></label>
      {tab==="album"&&<><label className="field">Ngày kỷ niệm<input type="date" value={values.event_date} onChange={e=>set("event_date",e.target.value)}/></label><label className="field">Mô tả<textarea maxLength={2000} value={values.description} onChange={e=>set("description",e.target.value)}/></label></>}
      {tab==="place"&&<>
        <label className="field">Vĩ độ<input type="number" step="any" min="-90" max="90" required value={values.latitude} onChange={e=>set("latitude",e.target.value)}/></label>
        <label className="field">Kinh độ<input type="number" step="any" min="-180" max="180" required value={values.longitude} onChange={e=>set("longitude",e.target.value)}/></label>
        <label className="field">Ngày ghé thăm<input type="date" value={values.visited_on} onChange={e=>set("visited_on",e.target.value)}/></label>
      </>}
      {tab==="milestone"&&<><label className="field">Ngày tháng<input type="date" required value={values.event_date} onChange={e=>set("event_date",e.target.value)}/></label><label className="field">Câu chuyện<textarea maxLength={4000} value={values.details} onChange={e=>set("details",e.target.value)}/></label></>}
      {tab!=="album"&&<label className="field">Album liên quan<select value={values.album_id} onChange={e=>set("album_id",e.target.value)}><option value="">Không chọn</option>{data.albums.filter(a=>!a.archived_at).map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label>}
      <div className="empty-actions"><button type="submit" disabled={busy} className="primary">{busy?"Đang lưu…":item?"Lưu thay đổi":"Tạo mới"}</button>{item&&<button type="button" className="secondary" onClick={()=>open(null)}>Hủy sửa</button>}</div>
    </form>
    {message&&<p className="status" role="status">{message}</p>}
  </section>;
}
