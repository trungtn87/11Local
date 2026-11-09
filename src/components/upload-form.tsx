"use client";

import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {ContributionPinPicker,type MemoryPin} from "./contribution-pin-picker";
import styles from "./upload-form.module.css";

type Choice = "none"|"existing"|"new";
type Item = {id:string;title:string};
type Prepared = {album_id:string;place_id:string|null;milestone_id:string|null};
export function UploadForm({albums,places,milestones,selected}:{
  albums:Item[];places:Item[];milestones:Item[];selected?:string;
}) {
  const initialAlbum=albums.some(a=>a.id===selected)?selected:albums[0]?.id||"";
  const [albumMode,setAlbumMode]=useState<"existing"|"new">(albums.length?"existing":"new");
  const [albumId,setAlbumId]=useState(initialAlbum);
  const [albumTitle,setAlbumTitle]=useState(""),[albumDescription,setAlbumDescription]=useState("");
  const [placeMode,setPlaceMode]=useState<Choice>("none"),[placeId,setPlaceId]=useState(places[0]?.id||"");
  const [placeTitle,setPlaceTitle]=useState(""),[pin,setPin]=useState<MemoryPin|null>(null);
  const [milestoneMode,setMilestoneMode]=useState<Choice>("none"),[milestoneId,setMilestoneId]=useState(milestones[0]?.id||"");
  const [milestoneTitle,setMilestoneTitle]=useState(""),[milestoneDetails,setMilestoneDetails]=useState("");
  const [takenOn,setTakenOn]=useState(()=>{
    const now=new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  }),[caption,setCaption]=useState("");
  const [files,setFiles]=useState<File[]>([]);
  const [previews,setPreviews]=useState<{url:string;name:string;title:string;description:string}[]>([]);
  const previewUrls=useRef<string[]>([]);
  const [prepared,setPrepared]=useState<Prepared|null>(null);
  const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState("");
  const requestId=useRef<string|null>(null);
  const locked=busy||prepared!==null;

  // Manage object URLs from the input event, not from a state-setting effect.
  useEffect(()=>()=>{previewUrls.current.forEach(url=>URL.revokeObjectURL(url));},[]);
  function chooseFiles(event:React.ChangeEvent<HTMLInputElement>) {
    const chosen=Array.from(event.target.files||[]).slice(0,10);
    previewUrls.current.forEach(url=>URL.revokeObjectURL(url));
    const next=chosen.map(file=>({name:file.name,url:URL.createObjectURL(file),title:file.name.replace(/\.[^.]+$/,"").slice(0,150),description:""}));
    previewUrls.current=next.map(item=>item.url);
    setPreviews(next);
    setFiles(chosen);
  }
  const setPinPoint=useCallback((point:MemoryPin)=>setPin(point),[]);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!files.length||busy||done)return;
    if(placeMode==="new"&&!pin&&!prepared){setMessage("Hãy chọn vị trí trên bản đồ trước khi đăng ảnh.");return;}
    setBusy(true);setMessage("");
    let context=prepared;
    try {
      if(!context) {
        if(!requestId.current)requestId.current=crypto.randomUUID();
        const payload={
          request_id:requestId.current,
          album:albumMode==="existing"?{mode:"existing",id:albumId}:{
            mode:"new",title:albumTitle,description:albumDescription,event_date:takenOn
          },
          place:placeMode==="none"?{mode:"none"}:placeMode==="existing"?{mode:"existing",id:placeId}:{
            mode:"new",title:placeTitle,latitude:pin!.latitude,longitude:pin!.longitude,visited_on:takenOn
          },
          milestone:milestoneMode==="none"?{mode:"none"}:milestoneMode==="existing"?{mode:"existing",id:milestoneId}:{
            mode:"new",title:milestoneTitle,details:milestoneDetails,event_date:takenOn
          }
        };
        const r=await fetch("/api/family/contributions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        const body=await r.json();
        if(!r.ok)throw new Error(body.error||"Không thể tạo kỷ niệm");
        context={album_id:body.album_id,place_id:body.place_id,milestone_id:body.milestone_id};
        setPrepared(context);
      }
      let uploaded=0;
      let uploadError="";
      for(const [index,file] of files.entries()) {
        const data=new FormData();
        data.set("image",file);
        data.set("album_id",context.album_id);
        data.set("batch_id",requestId.current!);
        data.set("caption",previews[index]?.description||caption);
        data.set("title",previews[index]?.title||file.name.replace(/\.[^.]+$/,""));
        if(takenOn)data.set("taken_on",takenOn);
        try {
          const r=await fetch("/api/photos",{method:"POST",body:data});
          const body=await r.json();
          if(!r.ok){uploadError=body.error||"Không tải được ảnh";break;}
          uploaded++;
        } catch {uploadError="Không kết nối được máy chủ";break;}
      }
      if(uploaded) {
        previewUrls.current.slice(0,uploaded).forEach(url=>URL.revokeObjectURL(url));
        previewUrls.current=previewUrls.current.slice(uploaded);
        setPreviews(current=>current.slice(uploaded));
        setFiles(current=>current.slice(uploaded));
      }
      if(!uploadError&&uploaded===files.length) {
        setDone(true);
        setMessage(`Đã đăng thành công ${uploaded} ảnh. Kỷ niệm được hiển thị ngay.`);
      } else {
        setMessage(`${uploaded?`Đã đăng ${uploaded} ảnh. `:""}${uploadError||"Có ảnh chưa được đăng."} Nhấn đăng tiếp để thử lại với ảnh còn lại.`);
      }
    } catch(error) {
      setMessage(error instanceof Error?error.message:"Có lỗi khi tạo kỷ niệm");
    } finally {setBusy(false);}
  }

  if(done&&prepared)return <div className={styles.success} role="status">
    <h2>💝 Kỷ niệm đã được lưu!</h2>
    <p>{message}</p>
    <div className={styles.actions}>
      <Link className="primary" href={`/album/${prepared.album_id}`}>Xem album vừa đóng góp</Link>
      <Link className="secondary" href="/dong-gop">Đóng góp kỷ niệm khác</Link>
    </div>
  </div>;
  return <form className={styles.memoryForm} onSubmit={event=>void submit(event)}>
    <section className={styles.section}>
      <h2>1. Album kỷ niệm</h2>
      <div className={`${styles.choiceGrid} ${styles.twoChoices}`}>
        {albums.length>0&&<button type="button" disabled={locked} aria-pressed={albumMode==="existing"} onClick={()=>setAlbumMode("existing")}>Chọn album có sẵn</button>}
        <button type="button" disabled={locked} aria-pressed={albumMode==="new"} onClick={()=>setAlbumMode("new")}>+ Tạo album mới</button>
      </div>
      {albumMode==="existing"
        ?<label className="field">Album muốn đóng góp<select required disabled={locked} value={albumId} onChange={e=>setAlbumId(e.target.value)}>
          {albums.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
        </select></label>
        :<div className={styles.fields}>
          <label className="field">Tên album<input required disabled={locked} maxLength={150} value={albumTitle} onChange={e=>setAlbumTitle(e.target.value)} placeholder="Ví dụ: Sinh nhật Gấu tròn 2 tuổi"/></label>
          <label className="field">Giới thiệu album<textarea maxLength={2000} disabled={locked} value={albumDescription} onChange={e=>setAlbumDescription(e.target.value)}/></label>
        </div>}
    </section>

    <section className={styles.section}>
      <h2>2. Địa điểm đã đi <small>(không bắt buộc)</small></h2>
      <div className={styles.choiceGrid}>
        <button type="button" disabled={locked} aria-pressed={placeMode==="none"} onClick={()=>setPlaceMode("none")}>Bỏ qua</button>
        <button type="button" disabled={locked||!places.length} aria-pressed={placeMode==="existing"} onClick={()=>setPlaceMode("existing")}>Đã có</button>
        <button type="button" disabled={locked} aria-pressed={placeMode==="new"} onClick={()=>setPlaceMode("new")}>+ Địa điểm mới</button>
      </div>
      {placeMode==="existing"&&<label className="field">Chọn địa điểm<select required disabled={locked} value={placeId} onChange={e=>setPlaceId(e.target.value)}>
        {places.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
      </select></label>}
      {placeMode==="new"&&<div className={styles.fields}>
        <label className="field">Tên địa điểm<input required disabled={locked} maxLength={150} value={placeTitle} onChange={e=>setPlaceTitle(e.target.value)} placeholder="Ví dụ: Công viên nơi Gấu tập đi"/></label>
        {prepared?<p className={styles.helper}>Đã lưu vị trí cho lượt đóng góp này.</p>
          :<ContributionPinPicker value={pin} onChange={setPinPoint}/>}
      </div>}
    </section>

    <section className={styles.section}>
      <h2>3. Cột mốc trên cây thời gian <small>(tùy chọn)</small></h2>
      <div className={styles.choiceGrid}>
        <button type="button" disabled={locked} aria-pressed={milestoneMode==="none"} onClick={()=>setMilestoneMode("none")}>Bỏ qua</button>
        <button type="button" disabled={locked||!milestones.length} aria-pressed={milestoneMode==="existing"} onClick={()=>setMilestoneMode("existing")}>Đã có</button>
        <button type="button" disabled={locked} aria-pressed={milestoneMode==="new"} onClick={()=>setMilestoneMode("new")}>+ Cột mốc mới</button>
      </div>
      {milestoneMode==="existing"&&<label className="field">Chọn cột mốc<select required disabled={locked} value={milestoneId} onChange={e=>setMilestoneId(e.target.value)}>
        {milestones.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}
      </select></label>}
      {milestoneMode==="new"&&<div className={styles.fields}>
        <label className="field">Tên cột mốc<input required disabled={locked} maxLength={150} value={milestoneTitle} onChange={e=>setMilestoneTitle(e.target.value)} placeholder="Ví dụ: Gấu biết đi những bước đầu tiên"/></label>
        <label className="field">Câu chuyện<textarea disabled={locked} maxLength={4000} value={milestoneDetails} onChange={e=>setMilestoneDetails(e.target.value)}/></label>
      </div>}
    </section>

    <section className={styles.section}>
      <h2>4. Ảnh và lời nhắn</h2>
      <label className="field">Ngày kỷ niệm<input type="date" required disabled={locked} value={takenOn} onChange={e=>setTakenOn(e.target.value)}/></label>
      <p className={styles.helper}>Dùng ngày này cho ảnh, album mới, địa điểm mới và cột mốc mới. Nội dung đã có không bị đổi ngày.</p>
      <label className="field">Ảnh kỷ niệm (tối đa 10 ảnh/lần)<input type="file" disabled={busy||done} accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={chooseFiles}/></label>
      {previews.length>0&&<div className={styles.previews}>{previews.map((preview,i)=><div className={styles.preview} key={preview.url}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview.url} alt={`Ảnh xem trước ${i+1}`}/>
        <small title={preview.name}>{preview.name}</small>
        <label className="field">Tên ảnh<input maxLength={150} disabled={busy} value={preview.title} onChange={e=>setPreviews(items=>items.map((item,j)=>j===i?{...item,title:e.target.value}:item))}/></label>
        <label className="field">Câu chuyện riêng của ảnh<textarea maxLength={2000} disabled={busy} value={preview.description} onChange={e=>setPreviews(items=>items.map((item,j)=>j===i?{...item,description:e.target.value}:item))}/></label>
      </div>)}</div>}
      <label className="field">Lời nhắn chung (dùng cho ảnh chưa có mô tả riêng)<textarea maxLength={2000} disabled={locked} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Một kỷ niệm nhỏ của gia đình…"/></label>
      <p className={styles.helper}>Ảnh sẽ được nén WebP tối đa 2048px; ảnh gốc vẫn ở thiết bị của bạn. Không giới hạn số ảnh đăng mỗi ngày.</p>
    </section>

    <p className={styles.note}>Thành viên đã được duyệt sẽ đăng công khai ngay, không phải chờ Admin duyệt ảnh, album, địa điểm hay cột mốc. Admin có thể quản lý nội dung.</p>
    {prepared&&<p className={styles.helper}>Thông tin album, địa điểm và cột mốc đã lưu. Nếu còn ảnh bị lỗi, bạn có thể tiếp tục tải lên mà không tạo trùng nội dung.</p>}
    {message&&<p className={styles.error} role="alert">{message}</p>}
    <div className={styles.actions}>
      <button type="submit" className="primary" disabled={busy||!files.length}>{busy?"Đang đăng ảnh…":prepared?"Đăng tiếp ảnh còn lại":"Lưu kỷ niệm & đăng ảnh"}</button>
    </div>
  </form>;
}
