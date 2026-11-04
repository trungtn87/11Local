
import {useEffect,useState} from 'react';
import {Link,useNavigate,useParams,useLocation} from 'react-router-dom';
import {AlertTriangle,ArrowLeft,Camera,CheckCircle2,Edit3,ImagePlus,ShieldCheck,UploadCloud,X} from 'lucide-react';
import '../styles/existing-feedback.css';
const types=[
  {id:'report',label:'Báo thông tin sai',icon:AlertTriangle,help:'Báo địa điểm ngừng hoạt động, trùng hoặc thông tin không chính xác.'},
  {id:'edit_place',label:'Đề xuất sửa',icon:Edit3,help:'Gửi giá trị mới để Admin đối chiếu trước khi cập nhật.'},
  {id:'photo',label:'Gửi ảnh',icon:ImagePlus,help:'Góp ảnh thực tế cho địa điểm. Ảnh chỉ công khai sau khi được duyệt.'},
];
const fields=[
  ['name','Tên địa điểm'],['address','Địa chỉ'],['area','Khu vực'],
  ['summary','Giới thiệu ngắn'],['description','Mô tả'],
  ['phone','Số điện thoại'],['opening_hours','Giờ mở cửa'],
  ['website_url','Website'],['price_note','Giá tham khảo'],
];
const fieldValues={
  name:'name',address:'address',area:'area',summary:'summary',
  description:'description',phone:'phone',opening_hours:'opening_hours',
  website_url:'website_url',price_note:'price_note',
};
const allowed=['image/jpeg','image/png','image/webp','image/avif'];
const errors={
  INVALID_NOTE:'Nội dung báo cáo hoặc đề xuất cần có ít nhất 10 ký tự.',
  INVALID_VALUE:'Giá trị đề xuất không hợp lệ.',
  INVALID_PHONE:'Số điện thoại không hợp lệ.',
  INVALID_WEBSITE_URL:'Đường dẫn website phải bắt đầu bằng http:// hoặc https://.',
  INVALID_IMAGE:'Ảnh không hợp lệ. Chọn JPEG, PNG, WebP hoặc AVIF dưới 10 MB.',
  TOO_MANY_PHOTOS:'Tối đa 4 ảnh.',
  PHOTO_REQUIRED:'Hãy chọn ít nhất một ảnh.',
  RATE_LIMITED:'Đã vượt giới hạn gửi đóng góp trong 24 giờ.',
  PLACE_NOT_PUBLIC:'Địa điểm đã ẩn hoặc không còn công khai.',
  CONTRIBUTION_UNAVAILABLE:'Không lưu được đóng góp. Vui lòng thử lại.',
};
export function ExistingPlaceFeedback(){
  const {id:slug}=useParams();
  const location=useLocation();
  const navigate=useNavigate();
  const queryType=new URLSearchParams(location.search).get('loai');
  const [type,setType]=useState(types.some(t=>t.id===queryType)?queryType:'report');
  const [place,setPlace]=useState(null);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState('');
  const [note,setNote]=useState('');
  const [reason,setReason]=useState('incorrect');
  const [fieldKey,setFieldKey]=useState('name');
  const [value,setValue]=useState('');
  const [photos,setPhotos]=useState([]);
  const [previews,setPreviews]=useState([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setLoadError('');
    fetch('/api/places/'+encodeURIComponent(slug||'')+'/detail',{signal:controller.signal,cache:'no-store'})
      .then(async r=>{if(!r.ok)throw Error('Không tìm thấy địa điểm công khai.');return r.json();})
      .then(data=>{setPlace(data.place);setFieldKey('name');setValue(data.place?.name||'');})
      .catch(e=>{if(e.name!=='AbortError')setLoadError(e.message||'Không tải được địa điểm.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[slug]);
  useEffect(()=>{
    const urls=photos.map(photo=>URL.createObjectURL(photo));
    setPreviews(urls);
    return()=>urls.forEach(url=>URL.revokeObjectURL(url));
  },[photos]);
  const chooseField=key=>{
    setFieldKey(key);setValue(String(place?.[fieldValues[key]]||''));
  };
  const addPhotos=e=>{
    const selected=Array.from(e.target.files||[]);
    e.target.value='';
    if(selected.some(p=>!allowed.includes(p.type)||!p.size||p.size>10*1024*1024)){
      setError('Chỉ nhận ảnh JPEG, PNG, WebP, AVIF dưới 10 MB.');return;
    }
    if(photos.length+selected.length>4){setError('Tối đa 4 ảnh mỗi lượt gửi.');return;}
    setPhotos(old=>[...old,...selected]);setError('');
  };
  const submit=async e=>{
    e.preventDefault();
    if(!place||busy)return;
    setError('');setBusy(true);
    try{
      const form=new FormData();
      form.set('payload',JSON.stringify({
        kind:type,placeId:place.id,note,
        ...(type==='report'?{reason}:{}),
        ...(type==='edit_place'?{fieldKey,proposedValue:value}:{}),
      }));
      if(type==='photo')photos.forEach(p=>form.append('photos',p));
      const response=await fetch('/api/contributions/existing',{method:'POST',body:form});
      const body=await response.json();
      if(!response.ok)throw Error(body.error||'CONTRIBUTION_UNAVAILABLE');
      navigate(body.trackingUrl,{replace:true});
    }catch(e){setError(errors[e.message]||'Không gửi được đóng góp. Vui lòng kiểm tra thông tin.');}
    finally{setBusy(false);}
  };
  if(loading)return <div className="container page"><p role="status">Đang tải địa điểm…</p></div>;
  if(loadError||!place)return <div className="container page stack"><p role="alert">{loadError||'Không tìm thấy địa điểm.'}</p><Link to="/tim-kiem" className="btn btn-outline">Tìm địa điểm</Link></div>;
  return <div className="container page stack-lg existing-feedback">
    <Link to={'/dia-diem/'+place.slug} className="small muted"><ArrowLeft size={16}/> Về trang địa điểm</Link>
    <header className="existing-feedback-header">
      <h1>Cùng cập nhật 11Local</h1>
      <p>Đóng góp của bạn giúp thông tin Cao Bằng chính xác, hữu ích hơn.</p>
      <div className="existing-feedback-place"><strong>{place.name}</strong><span>{place.address||place.area||'Cao Bằng'}</span></div>
    </header>
    <div className="existing-feedback-layout">
      <form onSubmit={submit} className="card stack existing-feedback-form">
        <h2>Bạn muốn đóng góp gì?</h2>
        <div className="existing-feedback-tabs" role="group" aria-label="Loại đóng góp">
          {types.map(t=><button type="button" key={t.id} onClick={()=>{setType(t.id);setError('');}}
            data-active={type===t.id}><t.icon size={19}/>{t.label}</button>)}
        </div>
        <p className="small muted">{types.find(t=>t.id===type)?.help}</p>
        {type==='report'&&<div className="field"><label htmlFor="feedback-reason">Vấn đề gặp phải</label>
          <select id="feedback-reason" className="select" value={reason} onChange={e=>setReason(e.target.value)}>
            <option value="incorrect">Thông tin sai</option>
            <option value="closed">Địa điểm đóng cửa / ngừng hoạt động</option>
            <option value="wrong_location">Vị trí trên bản đồ không chính xác</option>
            <option value="duplicate">Địa điểm bị trùng</option>
            <option value="other">Vấn đề khác</option>
          </select></div>}
        {type==='edit_place'&&<div className="stack-sm">
          <div className="field"><label htmlFor="feedback-field">Thông tin cần sửa</label>
            <select id="feedback-field" className="select" value={fieldKey} onChange={e=>chooseField(e.target.value)}>
              {fields.map(([key,label])=><option key={key} value={key}>{label}</option>)}
            </select></div>
          <div className="existing-feedback-current"><small>Thông tin hiện tại</small>
            <p>{place[fieldValues[fieldKey]]||'Chưa có thông tin'}</p></div>
          <div className="field"><label htmlFor="feedback-value">Giá trị đề xuất mới</label>
            {['description','summary','address'].includes(fieldKey)
              ?<textarea id="feedback-value" className="textarea" required={fieldKey==='name'}
                value={value} maxLength={fieldKey==='description'?3000:fieldKey==='address'?500:350}
                onChange={e=>setValue(e.target.value)} rows={4}/>
              :<input id="feedback-value" className="input" value={value}
                maxLength={fieldKey==='website_url'?500:fieldKey==='opening_hours'||fieldKey==='price_note'?300:160}
                onChange={e=>setValue(e.target.value)}/>}
          </div>
          <p className="small muted">Mỗi lượt đề xuất sửa một trường để Admin dễ đối chiếu. Vị trí bản đồ có thể báo bằng mục “Báo thông tin sai”.</p>
        </div>}
        {type==='photo'&&<div className="stack-sm">
          <label className="contrib-upload"><UploadCloud size={23}/> Chọn ảnh địa điểm
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={addPhotos} aria-label="Thêm ảnh thực tế"/></label>
          <p className="small muted">Tối đa 4 ảnh, 10 MB mỗi ảnh. Ảnh cộng đồng được lưu riêng, chủ địa điểm không tự xóa ảnh này.</p>
          <div className="existing-feedback-previews">{photos.map((p,i)=><div key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previews[i] || ''} alt={'Ảnh được chọn '+(i+1)}/>
            <button type="button" aria-label={'Bỏ ảnh '+(i+1)}
              onClick={()=>setPhotos(old=>old.filter((_,n)=>n!==i))}><X size={14}/></button>
          </div>)}</div>
        </div>}
        <div className="field"><label htmlFor="feedback-note">
          {type==='report'?'Mô tả vấn đề':type==='edit_place'?'Lý do / nguồn xác minh':'Chú thích ảnh (không bắt buộc)'}
        </label>
          <textarea id="feedback-note" className="textarea" rows={4} maxLength={1200}
            required={type!=='photo'} minLength={type==='photo'?0:10}
            placeholder={type==='photo'?'Ví dụ: Ảnh chụp trước cửa quán tháng 11/2026':'Mô tả điều bạn quan sát thực tế, giúp Admin xác minh'}
            value={note} onChange={e=>setNote(e.target.value)}/></div>
        <div className="contrib-assurance"><ShieldCheck size={20}/>
          <p>Không bắt buộc đăng nhập. Chỉ Admin kiểm duyệt mới có quyền công khai hoặc cập nhật thông tin. Hãy lưu liên kết theo dõi sau khi gửi.</p></div>
        {error&&<p className="contrib-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy||type==='photo'&&!photos.length}>
          {busy?'Đang gửi đóng góp…':'Gửi cho Admin xét duyệt'}<CheckCircle2 size={18}/></button>
      </form>
      <aside className="card existing-feedback-aside stack-sm">
        <h3>Quy trình kiểm duyệt</h3>
        <p><strong>1.</strong> Gửi báo cáo, đề xuất sửa hoặc ảnh thực tế.</p>
        <p><strong>2.</strong> Admin xem xét và có thể yêu cầu bạn bổ sung thông tin.</p>
        <p><strong>3.</strong> Bạn dùng liên kết riêng để phản hồi, không phải tạo tài khoản.</p>
        <p><strong>4.</strong> Chỉ nội dung được duyệt mới cập nhật vào 11Local.</p>
        <div className="existing-feedback-important"><Camera size={18}/>
          <span>Báo địa điểm sai không tự động xóa hoặc ẩn địa điểm; Admin cần xác minh trước.</span></div>
      </aside>
    </div>
  </div>;
}
