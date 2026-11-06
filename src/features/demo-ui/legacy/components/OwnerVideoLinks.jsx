import {useEffect,useState} from "react";
import {ExternalLink,Link2,Trash2,Video} from "lucide-react";

const labels={tiktok:"TikTok",facebook:"Facebook",youtube:"YouTube"};
const statuses={pending:"Chờ Admin duyệt",approved:"Đã duyệt",rejected:"Đã từ chối"};
const errors={
  LOGIN_REQUIRED:"Hãy đăng nhập lại tài khoản Google.",
  FORBIDDEN:"Chỉ chủ sở hữu đã xác minh mới được quản lý video của địa điểm.",
  PLACE_NOT_EDITABLE:"Địa điểm không còn được phép chỉnh sửa.",
  VIDEO_EXISTS:"Video này đã được liên kết với địa điểm.",
  VIDEO_LIMIT:"Bạn đã đạt giới hạn 50 video cho địa điểm.",
  INVALID_VIDEO_URL:"Link phải bắt đầu bằng https:// và thuộc TikTok, Facebook hoặc YouTube.",
  UNSUPPORTED_VIDEO_LINK:"Hãy gửi link của video, Reel, bài viết hoặc Shorts cụ thể.",
  INVALID_VIDEO_DETAILS:"Tiêu đề hoặc tên tác giả không hợp lệ.",
};
async function read(url,options={}){
  const response=await fetch(url,{cache:"no-store",...options});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error||"UNAVAILABLE");
  return body;
}

/** Self-service video link submissions; approval stays with Admin. */
export function OwnerVideoLinks({placeId}){
  const [items,setItems]=useState([]);
  const [url,setUrl]=useState("");
  const [title,setTitle]=useState("");
  const [creatorName,setCreatorName]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [refresh,setRefresh]=useState(0);
  const endpoint="/api/managed-places/"+encodeURIComponent(placeId)+"/videos";
  useEffect(()=>{
    const ctl=new AbortController();
    void Promise.resolve().then(async()=>{
      try{
        const body=await read(endpoint,{signal:ctl.signal});
        if(!ctl.signal.aborted){setItems(body.videos||[]);setError("");}
      }catch(e){if(!ctl.signal.aborted)setError(errors[e.message]||"Không tải được video của địa điểm.");}
      finally{if(!ctl.signal.aborted)setLoading(false);}
    });
    return ()=>ctl.abort();
  },[endpoint,refresh]);
  async function add(e){
    e.preventDefault();
    if(busy||!url.trim())return;
    setBusy(true);setError("");setSuccess("");
    try{
      await read(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({url,title,creatorName})});
      setUrl("");setTitle("");setCreatorName("");
      setSuccess("Đã gửi video. Video chỉ xuất hiện công khai sau khi Admin duyệt.");
      setRefresh(n=>n+1);
    }catch(e){setError(errors[e.message]||"Không thêm được video. Vui lòng thử lại.");}
    finally{setBusy(false);}
  }
  async function remove(item){
    if(busy||!item.is_mine||!window.confirm("Gỡ video do bạn đã gửi khỏi địa điểm?"))return;
    setBusy(true);setError("");setSuccess("");
    try{
      await read(endpoint+"/"+encodeURIComponent(item.id),{method:"DELETE"});
      setSuccess("Đã gỡ link video của bạn.");
      setRefresh(n=>n+1);
    }catch(e){setError(errors[e.message]||"Không gỡ được video. Vui lòng thử lại.");}
    finally{setBusy(false);}
  }
  return <section className="owner-editor-card owner-video-section">
    <div className="owner-editor-section-title"><div>
      <h2><Video size={20}/> Video liên kết với địa điểm</h2>
      <p>Đính kèm link TikTok, Facebook hoặc YouTube vào phần thông tin kèm theo của quán.</p>
    </div></div>
    <form className="owner-video-form" onSubmit={add}>
      <label>Link video *
        <input type="url" required maxLength={1024} placeholder="https://www.tiktok.com/@.../video/..."
          value={url} onChange={e=>setUrl(e.target.value)} disabled={busy}/></label>
      <div className="owner-video-fields">
        <label>Tiêu đề (tùy chọn)
          <input type="text" maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy}/></label>
        <label>Người review (tùy chọn)
          <input type="text" maxLength={120} value={creatorName}
            onChange={e=>setCreatorName(e.target.value)} disabled={busy}/></label>
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy||!url.trim()}>
        <Link2 size={16}/> {busy?"Đang xử lý…":"Gửi video chờ duyệt"}</button>
      <p className="owner-editor-hint">Chủ quán được tự thêm và gỡ link do mình gửi. Video từ Admin và cộng đồng vẫn được giữ riêng.</p>
    </form>
    {error&&<p className="owner-video-alert" role="alert">{error}</p>}
    {success&&<p className="owner-video-success" role="status">{success}</p>}
    <h3>Video đã liên kết</h3>
    {loading?<p className="owner-editor-empty">Đang tải video…</p>:
      !items.length?<p className="owner-editor-empty">Chưa có video liên kết với địa điểm này.</p>:
      <div className="owner-video-list">{items.map(item=><article key={item.id} className="owner-video-item">
        <div className="owner-video-item-title"><strong>{item.title||"Video "+(labels[item.provider]||item.provider)}</strong>
          <span className={"badge badge-"+(item.moderation_status==="approved"?"success":
            item.moderation_status==="pending"?"warning":"neutral")}>
            {statuses[item.moderation_status]||item.moderation_status}</span></div>
        <small>{labels[item.provider]||item.provider} · {item.is_mine?"Bạn đã gửi":"Video đã liên kết"}
          {item.creator_name?" · "+item.creator_name:""}</small>
        {item.is_mine&&item.moderation_status==="rejected"&&item.decision_note&&
          <p className="owner-video-reason">Lý do: {item.decision_note}</p>}
        <div className="owner-video-item-actions">
          <a href={item.source_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14}/> Xem video gốc</a>
          {item.is_mine&&<button type="button" disabled={busy} onClick={()=>void remove(item)}>
            <Trash2 size={14}/> Gỡ link của tôi</button>}
        </div>
      </article>)}</div>}
  </section>;
}
