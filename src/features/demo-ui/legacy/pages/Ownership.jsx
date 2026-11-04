import {useCallback,useEffect,useState} from 'react';
import {Link,useLocation,useNavigate,useParams} from 'react-router-dom';
import {
  ArrowLeft,ArrowRight,BadgeCheck,CheckCircle2,Clock3,FileCheck2,
  ImagePlus,LockKeyhole,MapPin,RefreshCw,Send,ShieldAlert,ShieldCheck,
  Store,UserRoundCheck,XCircle,
} from 'lucide-react';
import {useApp} from '../store.jsx';
import {Banner,Button,StateBlock} from '../components/ui.jsx';
import '../styles/ownership.css';

export const CLAIM_STATUS={
  pending:{label:'Đang chờ xác minh',color:'warning',icon:Clock3},
  needs_info:{label:'Cần bổ sung thông tin',color:'warning',icon:ShieldAlert},
  disputed:{label:'Đang xử lý tranh chấp',color:'danger',icon:ShieldAlert},
  approved:{label:'Đã xác minh',color:'success',icon:CheckCircle2},
  rejected:{label:'Không được chấp thuận',color:'danger',icon:XCircle},
};
const ERRORS={
  LOGIN_REQUIRED:'Phiên đăng nhập Google đã hết hạn. Hãy đăng nhập lại.',
  INVALID_PLACE:'Địa điểm không hợp lệ.',
  PLACE_NOT_CLAIMABLE:'Địa điểm không còn công khai hoặc chưa hỗ trợ xác minh chủ.',
  CLAIM_EXISTS:'Bạn đã có yêu cầu đang xử lý cho địa điểm này.',
  ALREADY_OWNER:'Bạn đã là chủ địa điểm này.',
  RATE_LIMITED:'Bạn đã gửi quá số yêu cầu trong 24 giờ. Vui lòng thử lại sau.',
  INVALID_PHONE:'Hãy nhập số điện thoại Việt Nam hợp lệ (10 số).',
  INVALID_NAME:'Họ tên cần từ 2 đến 100 ký tự.',
  INVALID_STATEMENT:'Hãy mô tả cách xác minh (20–2.000 ký tự).',
  INVALID_RELATIONSHIP:'Hãy chọn quan hệ với địa điểm.',
  INVALID_IMAGE:'Ảnh phải là JPEG, PNG, WebP hoặc AVIF, tối đa 8 MB.',
  TOO_MANY_IMAGES:'Mỗi yêu cầu được tải lên tối đa 3 ảnh chứng minh.',
  CLAIM_NOT_EDITABLE:'Yêu cầu đã được xử lý nên không thể thêm ảnh.',
  NOT_WAITING_FOR_REPLY:'Admin chưa yêu cầu bổ sung hoặc yêu cầu đã được xử lý.',
  STALE_VERSION:'Yêu cầu đã được cập nhật ở phiên khác. Hãy làm mới trang.',
  INVALID_MESSAGE:'Nội dung bổ sung cần từ 5 đến 1.500 ký tự.',
  CLAIMS_UNAVAILABLE:'Không đọc được hồ sơ nhận quyền. Vui lòng thử lại.',
  MANAGED_PLACES_UNAVAILABLE:'Không tải được danh sách địa điểm quản lý.',
};
const formatDate=(value)=>{
  if(!value)return '';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'':date.toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
};
async function api(url,options){
  const response=await fetch(url,{cache:'no-store',...options});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error||'UNAVAILABLE');
  return body;
}
const message=(error)=>ERRORS[error?.message]||'Không thể hoàn tất thao tác. Hãy thử lại.';
const placeHref=(slug)=>'/ban-do?place='+encodeURIComponent(slug)+'&detail=1';

function GoogleGate({returnTo}){
  const url='/api/auth/google/start?returnTo='+encodeURIComponent(returnTo);
  return <section className="ownership-gate">
    <LockKeyhole size={28}/>
    <h2>Đăng nhập Google để nhận quyền</h2>
    <p>Tài khoản Google giúp 11Local liên hệ và theo dõi hồ sơ. Quyền chủ địa điểm vẫn do Admin xác minh thủ công.</p>
    <a className="btn btn-primary" href={url}>Tiếp tục với Google <ArrowRight size={17}/></a>
    <p className="small muted">Không cần OTP, không cần tạo mật khẩu 11Local.</p>
  </section>;
}
export function ClaimBadge({status}){
  const config=CLAIM_STATUS[status]||{label:'Chưa rõ trạng thái',color:'neutral',icon:Clock3};
  const Icon=config.icon;
  return <span className={'badge badge-'+config.color}><Icon size={14}/>{config.label}</span>;
}
function PlaceHeading({place}){
  return <section className="ownership-place">
    {place.cover_photo_id
      ? <img src={'/api/place-photos/'+encodeURIComponent(place.cover_photo_id)} alt="" loading="lazy"/>
      : <div className="ownership-place-icon"><Store size={30}/></div>}
    <div><strong>{place.name}</strong><span><MapPin size={14}/>{place.address||place.area||'Cao Bằng'}</span>
      <Link to={placeHref(place.slug)}>Xem trang địa điểm <ArrowRight size={13}/></Link>
    </div>
  </section>;
}
function RequestForm({place,user}){
  const navigate=useNavigate();
  const [name,setName]=useState(user?.name||'');
  const [phone,setPhone]=useState('');
  const [relationship,setRelationship]=useState('owner');
  const [statement,setStatement]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const submit=async event=>{
    event.preventDefault();
    if(busy)return;
    setBusy(true);setError('');
    try{
      const body=await api('/api/ownership-claims',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          placeId:place.id,claimantName:name,contactPhone:phone,relationship,statement,
        })});
      navigate('/yeu-cau-nhan-quyen?claim='+encodeURIComponent(body.id),{replace:true});
    }catch(e){setError(message(e));}
    finally{setBusy(false);}
  };
  return <form className="ownership-form" onSubmit={submit}>
    <div className="ownership-section-heading"><span className="ownership-step">01</span>
      <div><h2>Thông tin người yêu cầu</h2><p>Điền thông tin thật để Admin có thể đối chiếu.</p></div>
    </div>
    <div className="ownership-form-grid">
      <div className="field"><label htmlFor="ownership-name">Họ tên *</label>
        <input id="ownership-name" className="input" autoComplete="name" required minLength={2}
          maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></div>
      <div className="field"><label htmlFor="ownership-phone">Số điện thoại liên hệ *</label>
        <input id="ownership-phone" className="input" type="tel" inputMode="tel"
          autoComplete="tel" placeholder="09xx xxx xxx" required maxLength={16}
          value={phone} onChange={e=>setPhone(e.target.value)}/></div>
    </div>
    <div className="field"><label htmlFor="ownership-relation">Quan hệ với địa điểm *</label>
      <select id="ownership-relation" className="select" value={relationship}
        onChange={e=>setRelationship(e.target.value)}>
        <option value="owner">Tôi là chủ địa điểm</option>
        <option value="authorized">Tôi được chủ ủy quyền quản lý</option>
      </select></div>
    <div className="field"><label htmlFor="ownership-statement">Cách chứng minh quyền quản lý *</label>
      <textarea id="ownership-statement" className="textarea" required minLength={20}
        maxLength={2000} rows={5} value={statement} onChange={e=>setStatement(e.target.value)}
        placeholder="Ví dụ: Tôi đang trực tiếp kinh doanh tại địa chỉ trên; Admin có thể gọi đến số này để xác minh…"/>
      <span className="hint">Tối thiểu 20 ký tự. Có thể bổ sung ảnh bằng chứng sau khi gửi yêu cầu.</span></div>
    <div className="ownership-private"><LockKeyhole size={18}/><p>Thông tin và bằng chứng chỉ dành cho Admin kiểm duyệt, không hiển thị công khai.</p></div>
    {error&&<Banner type="danger">{error}</Banner>}
    <Button block size="lg" loading={busy} type="submit" icon={Send}>
      Gửi yêu cầu xác minh</Button>
  </form>;
}

export function ClaimRequestPage(){
  const {id:slug}=useParams();
  return <ClaimRequestBody key={slug} slug={slug}/>;
}
function ClaimRequestBody({slug}){
  const {currentUser,authState}=useApp();
  const identity=currentUser?.id||'';
  const [state,setState]=useState({loading:true,userKey:null,place:null,claims:[],managed:[],error:''});
  useEffect(()=>{
    const ctl=new AbortController();
    void (async()=>{
      try{
        const placeResult=await api('/api/places?slug='+encodeURIComponent(slug||''),{signal:ctl.signal});
        const place=placeResult.places?.[0];
        if(!place||place.place_kind!=='business')throw new Error('PLACE_NOT_CLAIMABLE');
        let claims=[],managed=[];
        if(currentUser){
          const [a,b]=await Promise.all([
            api('/api/me/ownership-claims',{signal:ctl.signal}),
            api('/api/me/managed-places',{signal:ctl.signal}),
          ]);
          claims=a.claims||[];
          managed=b.places||[];
        }
        if(!ctl.signal.aborted)setState({loading:false,userKey:identity,place,claims,managed,error:''});
      }catch(error){
        if(!ctl.signal.aborted)setState({loading:false,userKey:identity,place:null,claims:[],managed:[],error:message(error)});
      }
    })();
    return ()=>ctl.abort();
  },[slug,currentUser]);
  if(authState==='loading'||state.loading||state.userKey!==identity)return <div className="container page"><p role="status">Đang tải thông tin xác minh…</p></div>;
  if(state.error||!state.place)return <div className="container page"><StateBlock kind="error"
    title="Không thể mở yêu cầu" actions={<Link className="btn btn-outline" to="/tim-kiem">Quay lại tìm kiếm</Link>}>{state.error}</StateBlock></div>;
  const place=state.place;
  const active=state.managed.find(row=>row.id===place.id);
  const existing=state.claims.find(row=>row.place_id===place.id
    && ['pending','needs_info','disputed','approved'].includes(row.status));
  return <div className="container page ownership-root">
    <Link className="ownership-back" to={placeHref(place.slug)}><ArrowLeft size={16}/> Quay lại địa điểm</Link>
    <header className="ownership-intro"><span className="ownership-kicker"><ShieldCheck size={17}/> 11Local · Xác minh chủ địa điểm</span>
      <h1>Nhận quyền quản lý địa điểm</h1>
      <p>Giúp thông tin của quán luôn chính xác. Admin 11Local sẽ xác minh thủ công trước khi cấp quyền.</p>
    </header>
    <div className="ownership-columns">
      <section className="ownership-main">
        <PlaceHeading place={place}/>
        {authState==='error'?<Banner type="warning">Không kiểm tra được trạng thái đăng nhập. Hãy tải lại trang.</Banner>
          :!currentUser?<GoogleGate returnTo={'/nhan-quyen/'+slug}/>
          :active?<div className="ownership-result"><BadgeCheck size={32}/>
            <h2>Bạn đang quản lý địa điểm này</h2><p>Quyền: {active.role==='owner'?'Chủ địa điểm':'Người quản lý'}.</p>
            <Link className="btn btn-primary" to="/quan-ly">Địa điểm của tôi</Link></div>
          :existing?<div className="ownership-result">
            <ClaimBadge status={existing.status}/>
            <h2>Yêu cầu của bạn đã được ghi nhận</h2>
            <p>{existing.decision_note||'Bạn có thể theo dõi tiến độ, bổ sung ảnh và phản hồi khi Admin yêu cầu.'}</p>
            <Link className="btn btn-primary" to={'/yeu-cau-nhan-quyen?claim='+existing.id}>Theo dõi yêu cầu <ArrowRight size={16}/></Link>
          </div>
          :<RequestForm place={place} user={currentUser}/>}
      </section>
      <aside className="ownership-aside">
        <h3>Quy trình xác minh</h3>
        <ol><li><strong>Gửi yêu cầu</strong><span>Đăng nhập Google, cung cấp liên hệ và cách xác minh.</span></li>
          <li><strong>Admin kiểm tra</strong><span>Có thể yêu cầu bạn bổ sung bằng chứng.</span></li>
          <li><strong>Cấp quyền</strong><span>Chỉ tài khoản được duyệt mới quản lý địa điểm.</span></li></ol>
        <div className="ownership-help"><ShieldCheck size={19}/><p>Miễn phí xác minh. Không tự nhận quyền chỉ bằng số điện thoại trùng với thông tin quán.</p></div>
      </aside>
    </div>
  </div>;
}

export function MyOwnershipPage(){
  const {currentUser,authState}=useApp();
  const location=useLocation();
  const requestedId=new URLSearchParams(location.search).get('claim');
  const [state,setState]=useState({status:'loading',claims:[],messages:[],managed:[],error:''});
  const [selectedId,setSelectedId]=useState(requestedId);
  const [reply,setReply]=useState('');
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [error,setError]=useState('');
  const load=useCallback(async(signal)=>{
    try{
      const [a,b]=await Promise.all([
        api('/api/me/ownership-claims',{signal}),
        api('/api/me/managed-places',{signal}),
      ]);
      if(signal?.aborted)return;
      setState({status:'ready',claims:a.claims||[],messages:a.messages||[],managed:b.places||[],error:''});
    }catch(e){
      if(!signal?.aborted)setState(old=>({...old,status:'error',error:message(e)}));
    }
  },[]);
  useEffect(()=>{
    if(!currentUser)return;
    const ctl=new AbortController();
    void load(ctl.signal);
    return()=>ctl.abort();
  },[currentUser,load]);
  const claims=state.claims;
  const selected=claims.find(row=>row.id===selectedId)||claims[0]||null;
  const messages=state.messages.filter(row=>row.claim_id===selected?.id);
  const refresh=async()=>{setFeedback('');setError('');await load();};
  const replySubmit=async e=>{
    e.preventDefault();
    if(!selected||busy)return;
    setBusy(true);setFeedback('');setError('');
    try{
      await api('/api/ownership-claims/'+encodeURIComponent(selected.id)+'/reply',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({expectedVersion:Number(selected.version),message:reply})});
      setReply('');setFeedback('Đã gửi thông tin bổ sung tới Admin.');await load();
    }catch(e){setError(message(e));}
    finally{setBusy(false);}
  };
  const upload=async e=>{
    const photo=e.target.files?.[0];
    e.target.value='';
    if(!photo||!selected||busy)return;
    if(photo.size>8*1024*1024||!['image/jpeg','image/png','image/webp','image/avif'].includes(photo.type)){
      setError(ERRORS.INVALID_IMAGE);return;
    }
    setBusy(true);setFeedback('');setError('');
    try{
      const data=new FormData();data.set('file',photo);
      await api('/api/ownership-claims/'+encodeURIComponent(selected.id)+'/evidence',{
        method:'POST',body:data});
      setFeedback('Ảnh chứng minh đã được lưu riêng tư để Admin kiểm tra.');await load();
    }catch(err){setError(message(err));}
    finally{setBusy(false);}
  };
  if(authState==='loading')return <div className="container page">Đang kiểm tra tài khoản Google…</div>;
  if(authState==='error')return <div className="container page"><Banner type="warning">Không xác định được trạng thái đăng nhập. Hãy tải lại trang.</Banner></div>;
  if(!currentUser)return <div className="container page"><GoogleGate returnTo="/yeu-cau-nhan-quyen"/></div>;
  return <div className="container page ownership-root">
    <header className="ownership-intro ownership-intro-plain">
      <span className="ownership-kicker"><FileCheck2 size={17}/> Hồ sơ của tôi</span>
      <div className="ownership-title-row"><div><h1>Yêu cầu nhận quyền</h1><p>Chỉ bạn và Admin xem được hồ sơ này.</p></div>
        <button className="btn btn-outline btn-sm" type="button" onClick={()=>void refresh()} disabled={busy}>
          <RefreshCw size={16}/> Làm mới</button></div>
    </header>
    {state.status==='loading'&&<p role="status">Đang tải dữ liệu thật từ 11Local…</p>}
    {state.status==='error'&&<Banner type="danger">{state.error}</Banner>}
    {feedback&&<Banner type="success">{feedback}</Banner>}
    {error&&<Banner type="danger">{error}</Banner>}
    {state.status==='ready'&&<>
      {state.managed.length>0&&<section className="ownership-managed-note">
        <BadgeCheck size={23}/><div><strong>Địa điểm đã được cấp quyền: {state.managed.length}</strong>
          <p>Quyền quản lý hiện tại được kiểm tra lại tại máy chủ.</p></div>
        <Link className="btn btn-outline btn-sm" to="/quan-ly">Xem danh sách</Link></section>}
      {!claims.length?<StateBlock title="Bạn chưa có yêu cầu nhận quyền"
        actions={<Link className="btn btn-primary" to="/tim-kiem">Tìm địa điểm để nhận quyền</Link>}>
        Tìm quán trên bản đồ, mở phần chi tiết và chọn “Tôi là chủ địa điểm này”.
      </StateBlock>:<div className="ownership-columns">
        <aside className="ownership-claim-list" aria-label="Danh sách yêu cầu">
          <h2>Hồ sơ đã gửi <span>{claims.length}</span></h2>
          {claims.map(row=><button key={row.id} className="ownership-claim-item"
            type="button" data-active={selected?.id===row.id}
            onClick={()=>{setSelectedId(row.id);setReply('');setError('');setFeedback('');}}>
            <strong>{row.place_name}</strong><ClaimBadge status={row.status}/>
            <small>Gửi ngày {formatDate(row.created_at)}</small>
          </button>)}
        </aside>
        {selected&&<section className="ownership-claim-detail">
          <div className="ownership-title-row"><div><h2>{selected.place_name}</h2>
            <p>Gửi ngày {formatDate(selected.created_at)}</p></div><ClaimBadge status={selected.status}/></div>
          <p className="ownership-address"><Link to={placeHref(selected.slug)}>Xem địa điểm trên bản đồ <ArrowRight size={14}/></Link></p>
          <dl className="ownership-facts"><div><dt>Người yêu cầu</dt><dd>{selected.claimant_name}</dd></div>
            <div><dt>Liên hệ</dt><dd>{selected.contact_phone}</dd></div>
            <div><dt>Vai trò đề nghị</dt><dd>{selected.relationship==='owner'?'Chủ địa điểm':'Người được ủy quyền'}</dd></div>
            <div><dt>Ảnh chứng minh</dt><dd>{Number(selected.image_count)||0}/3 ảnh</dd></div></dl>
          <section className="ownership-statement"><h3>Nội dung đã gửi</h3>
            <p>{selected.evidence?.statement||'Không có thông tin mô tả.'}</p></section>
          {selected.decision_note&&<Banner type={selected.status==='rejected'?'danger':'info'}>
            <strong>Phản hồi Admin:</strong> {selected.decision_note}</Banner>}
          {messages.length>0&&<section className="ownership-message-list"><h3>Lịch sử trao đổi</h3>
            {messages.map(m=><article key={m.id} className="ownership-message" data-sender={m.sender}>
              <strong>{m.sender==='admin'?'Admin 11Local':'Bạn'}</strong>
              <time>{formatDate(m.created_at)}</time><p>{m.body}</p></article>)}
          </section>}
          {['pending','needs_info'].includes(selected.status)&&<div className="ownership-evidence">
            <div><h3>Ảnh chứng minh (riêng tư)</h3>
              <p>Không bắt buộc. Có thể gửi ảnh biển hiệu, mặt tiền hoặc giấy tờ liên quan.
                Không tải ảnh CCCD nếu Admin chưa hướng dẫn cách xử lý an toàn.</p></div>
            <label className="btn btn-outline btn-sm ownership-file">
              <ImagePlus size={17}/>{busy?'Đang tải…':'Tải thêm ảnh'}
              <input aria-label="Chọn ảnh chứng minh" type="file"
                accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy||Number(selected.image_count)>=3}
                onChange={upload}/>
            </label><small>Tối đa 3 ảnh mỗi yêu cầu; 8 MB/ảnh gốc. Chỉ Admin xem được.</small>
          </div>}
          {selected.status==='needs_info'&&<form className="ownership-reply" onSubmit={replySubmit}>
            <h3>Phản hồi yêu cầu bổ sung</h3>
            <textarea className="textarea" rows={4} required minLength={5} maxLength={1500}
              placeholder="Cung cấp thông tin Admin yêu cầu…" value={reply}
              onChange={e=>setReply(e.target.value)}/>
            <Button loading={busy} icon={Send} type="submit">Gửi phản hồi</Button>
          </form>}
          {selected.status==='approved'&&<Link to="/quan-ly" className="btn btn-primary">
            <Store size={17}/> Xem quyền quản lý</Link>}
          {selected.status==='rejected'&&<Link to={'/nhan-quyen/'+encodeURIComponent(selected.slug)}
            className="btn btn-outline">Gửi yêu cầu mới</Link>}
        </section>}
      </div>}
    </>}
  </div>;
}
export function ManagedPlacesPage(){
  const {currentUser,authState}=useApp();
  const [state,setState]=useState({status:'loading',places:[],error:''});
  useEffect(()=>{
    if(!currentUser)return;
    const ctl=new AbortController();
    void api('/api/me/managed-places',{signal:ctl.signal})
      .then(data=>{if(!ctl.signal.aborted)setState({status:'ready',places:data.places||[],error:''});})
      .catch(e=>{if(!ctl.signal.aborted)setState({status:'error',places:[],error:message(e)});});
    return()=>ctl.abort();
  },[currentUser]);
  if(authState==='loading')return <div className="container page">Đang kiểm tra Google…</div>;
  if(authState==='error')return <div className="container page"><Banner type="warning">Không kiểm tra được phiên Google.</Banner></div>;
  if(!currentUser)return <div className="container page"><GoogleGate returnTo="/quan-ly"/></div>;
  return <div className="container page ownership-root">
    <header className="ownership-intro ownership-intro-plain"><span className="ownership-kicker"><UserRoundCheck size={18}/> Tài khoản Google đã đăng nhập</span>
      <h1>Địa điểm của tôi</h1><p>Danh sách địa điểm được Admin cấp quyền quản lý.</p></header>
    {state.status==='loading'&&<p role="status">Đang tải danh sách địa điểm thật…</p>}
    {state.status==='error'&&<Banner type="danger">{state.error}</Banner>}
    {state.status==='ready'&&(state.places.length?
      <div className="ownership-managed-grid">{state.places.map(place=><article key={place.id} className="ownership-managed-card">
        <div className="ownership-managed-card-top"><Store size={24}/><span className="badge badge-success"><BadgeCheck size={13}/> Đang có quyền</span></div>
        <h2>{place.name}</h2><p>{place.address||place.area||'Cao Bằng'}</p>
        <small>Vai trò: {place.role==='owner'?'Chủ địa điểm':'Người quản lý'}</small>
        <Link to={placeHref(place.slug)} className="btn btn-outline btn-sm">Xem trang địa điểm <ArrowRight size={15}/></Link>
      </article>)}</div>:<StateBlock title="Chưa có địa điểm được cấp quyền"
        actions={<Link to="/yeu-cau-nhan-quyen" className="btn btn-primary">Theo dõi hồ sơ xác minh</Link>}>
        Bạn có thể yêu cầu nhận quyền từ trang chi tiết một địa điểm đang công khai.
      </StateBlock>)}
    {state.status==='ready'&&state.places.length>0&&<Banner type="info">Gửi yêu cầu và xác minh chủ quán đã có. Màn chỉnh sửa thông tin, ảnh và giờ mở cửa sẽ được kết nối trong Bước 3.</Banner>}
    <Link className="ownership-back" to="/yeu-cau-nhan-quyen"><FileCheck2 size={16}/> Xem các yêu cầu nhận quyền</Link>
  </div>;
}
