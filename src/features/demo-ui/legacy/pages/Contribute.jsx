import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, Check, CheckCircle2, ChevronRight, ClipboardCopy, LocateFixed, MapPin, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { PinMap } from '../../../../app/admin/pin-map';

const CENTER = { latitude: 22.6666, longitude: 106.2588 };
const EMPTY = { name: '', categoryId: '', address: '', area: 'Cao Bằng', description: '', phone: '', openingHours: '', contactPhone: '', facebookUrl: '', youtubeUrl: '' };
const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const reasons = {
  NAME_REQUIRED: 'Hãy nhập tên địa điểm.', ADDRESS_REQUIRED: 'Hãy nhập địa chỉ hoặc mô tả đường đến.',
  AREA_REQUIRED: 'Hãy nhập khu vực.', INVALID_CATEGORY: 'Danh mục không hợp lệ hoặc đã bị ẩn.',
  INVALID_LATITUDE: 'Hãy chọn ghim vị trí trên bản đồ.', INVALID_LONGITUDE: 'Vị trí trên bản đồ không hợp lệ.',
  INVALID_PHONE: 'Số điện thoại của địa điểm không đúng định dạng.',
  INVALID_CONTACT_PHONE: 'Số điện thoại liên hệ của bạn không đúng định dạng.',
  INVALID_IMAGE: 'Ảnh không hợp lệ. Hỗ trợ JPEG, PNG, WebP, AVIF tối đa 10 MB/ảnh.',
  TOO_MANY_PHOTOS: 'Chỉ gửi tối đa 4 ảnh.', REQUEST_TOO_LARGE: 'Dung lượng ảnh quá lớn.',
  RATE_LIMITED: 'Bạn gửi quá nhanh. Hãy thử lại sau khoảng một phút.',
  DUPLICATE_SUBMISSION: 'Đóng góp này vừa được gửi thành công. Vui lòng kiểm tra trang theo dõi.',
  INVALID_FACEBOOK_URL: 'Liên kết Facebook phải thuộc facebook.com hoặc fb.watch.',
  INVALID_YOUTUBE_URL: 'Liên kết YouTube phải thuộc youtube.com hoặc youtu.be.',
  POSSIBLE_DUPLICATE: 'Địa điểm này có thể đã được gửi. Hãy kiểm tra và xác nhận nếu thực sự khác.',
  CONTRIBUTION_UNAVAILABLE: 'Không thể lưu đóng góp vào Neon. Vui lòng thử lại.',
};
const msg = (error) => reasons[error] || 'Không thể gửi đóng góp. Vui lòng thử lại.';

export function Contribute() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [pin, setPin] = useState(CENTER);
  const [pinSelected, setPinSelected] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [duplicates, setDuplicates] = useState(null);
  const [checking, setChecking] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key, value) => { setForm(current => ({ ...current, [key]: value })); if (key === 'name') setAcknowledged(false); };
  const setLocation = (longitude, latitude) => {
    setPin({ latitude, longitude });
    setPinSelected(true);
    setAcknowledged(false);
    setLocationError('');
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/categories', { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(body => {
        const data = body.categories || [];
        setCategories(data);
        setForm(current => ({ ...current, categoryId: current.categoryId || data[0]?.id || '' }));
        if (!data.length) setCatalogError('Hiện chưa có danh mục công khai.');
      })
      .catch(e => { if (e.name !== 'AbortError') setCatalogError('Không lấy được danh mục thật từ Neon.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const urls = photos.map(photo => URL.createObjectURL(photo));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [photos]);

  useEffect(() => {
    if (!pinSelected || form.name.trim().length < 3) { setDuplicates(null); setChecking(false); return; }
    const controller = new AbortController();
    setChecking(true);
    const timer = setTimeout(() => {
      const q = new URLSearchParams({ name: form.name, latitude: String(pin.latitude), longitude: String(pin.longitude) });
      fetch('/api/contributions/duplicates?' + q, { signal: controller.signal, cache: 'no-store' })
        .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(setDuplicates)
        .catch(e => { if (e.name !== 'AbortError') setDuplicates({ lookupUnavailable: true }); })
        .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [form.name, pin.latitude, pin.longitude, pinSelected]);

  const locateMe = () => {
    if (!navigator.geolocation) { setLocationError('Thiết bị không hỗ trợ GPS. Hãy kéo ghim trên bản đồ để chọn vị trí.'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setLocation(coords.longitude, coords.latitude),
      () => setLocationError('Không lấy được GPS. Bạn vẫn có thể kéo trực tiếp ghim để chọn vị trí.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const addPhotos = event => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    if (incoming.some(file => !allowed.includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) {
      setError('Chỉ chọn ảnh JPEG/PNG/WebP/AVIF dưới 10 MB mỗi ảnh.');
      return;
    }
    if (photos.length + incoming.length > 4) { setError('Tối đa 4 ảnh cho một địa điểm.'); return; }
    setPhotos(current => [...current, ...incoming]);
    setError('');
  };
  const removePhoto = index => setPhotos(current => current.filter((_, i) => i !== index));
  const setCover = index => setPhotos(current => [current[index], ...current.filter((_, i) => i !== index)]);

  const submit = async event => {
    event.preventDefault();
    if (!pinSelected) { setError('Hãy kéo ghim hoặc lấy vị trí GPS để xác nhận địa điểm.'); return; }
    if (!categories.some(category => category.id === form.categoryId)) { setError('Hãy chọn danh mục đang hiển thị.'); return; }
    setBusy(true); setError('');
    try {
      const data = new FormData();
      data.set('payload', JSON.stringify({ ...form, ...pin, acknowledgeDuplicate: acknowledged }));
      photos.forEach(photo => data.append('photos', photo));
      const response = await fetch('/api/contributions', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok) {
        if (result.error === 'POSSIBLE_DUPLICATE') { setDuplicates(result); setAcknowledged(false); }
        throw new Error(result.error || 'CONTRIBUTION_UNAVAILABLE');
      }
      navigate(result.trackingUrl, { replace: true });
    } catch (e) { setError(msg(e.message)); }
    finally { setBusy(false); }
  };

  const showDuplicate = duplicates?.hasDuplicate;
  return <div className="container page contrib-page">
    <header className="contrib-hero">
      <div className="contrib-hero-icon"><MapPin size={24} /></div>
      <div><h1>Thêm địa điểm mới</h1><p>Chia sẻ quán ngon, chỗ chơi và những địa điểm thú vị ở Cao Bằng.</p></div>
    </header>
    <div className="contrib-layout">
      <form className="contrib-form card stack" onSubmit={submit}>
        <section className="stack-sm">
          <h2 className="contrib-section-title">Thông tin địa điểm</h2>
          <div className="field"><label htmlFor="contrib-name">Tên địa điểm <span className="req">*</span></label>
            <input id="contrib-name" className="input" required maxLength={160} placeholder="Ví dụ: Phở chua Cô Đào" value={form.name} onChange={e => update('name', e.target.value)} /></div>
          <div className="field"><label htmlFor="contrib-category">Danh mục <span className="req">*</span></label>
            <select id="contrib-category" className="select" required value={form.categoryId} onChange={e => update('categoryId', e.target.value)} disabled={Boolean(catalogError)}>
              {!form.categoryId && <option value="">Chọn danh mục</option>}
              {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {catalogError && <p className="err-text" role="alert">{catalogError}</p>}
          </div>
          <div className="contrib-two">
            <div className="field"><label htmlFor="contrib-address">Địa chỉ / cách tìm đến <span className="req">*</span></label>
              <input id="contrib-address" className="input" required maxLength={500} placeholder="Đường, thôn, bản, số nhà..." value={form.address} onChange={e => update('address', e.target.value)}/></div>
            <div className="field"><label htmlFor="contrib-area">Khu vực <span className="req">*</span></label>
              <input id="contrib-area" className="input" required maxLength={120} placeholder="Xã / phường, Cao Bằng" value={form.area} onChange={e => update('area', e.target.value)}/></div>
          </div>
        </section>
        <section className="stack-sm">
          <div className="row between contrib-map-title"><h2 className="contrib-section-title">Ghim vị trí <span className="req">*</span></h2>
            <button type="button" className="btn btn-outline btn-sm" onClick={locateMe}><LocateFixed size={16}/> Vị trí của tôi</button></div>
          <p className="small muted">Giữ và kéo trực tiếp ghim xanh đến đúng vị trí. Kéo nền để xem khu vực khác, không làm đổi vị trí ghim.</p>
          <div className="contrib-map"><PinMap latitude={pin.latitude} longitude={pin.longitude} onChange={setLocation}/></div>
          <div className={'contrib-pin-state ' + (pinSelected ? 'selected' : '')}>
            {pinSelected ? <><CheckCircle2 size={17}/> Đã chọn vị trí địa điểm</> : <><MapPin size={17}/> Hãy kéo ghim để xác nhận vị trí địa điểm</>}
          </div>
          {locationError && <p className="err-text" role="alert">{locationError}</p>}
          {checking && <p className="small muted" role="status">Đang kiểm tra địa điểm gần đây…</p>}
          {duplicates?.lookupUnavailable && <p className="small muted">Chưa kiểm tra được trùng lặp. Admin vẫn sẽ rà soát trước khi công khai.</p>}
          {showDuplicate && <div className="contrib-warning" role="status">
            <strong>Có thể địa điểm này đã tồn tại</strong>
            {duplicates.matches?.map(place => <div key={place.id} className="contrib-match">
              <Link to={'/dia-diem/' + place.slug}>{place.name}</Link>
              <span>{place.distanceMeters} m</span></div>)}
            {duplicates.pendingNearby && <p>Đã có đóng góp cùng tên gần vị trí này đang chờ duyệt.</p>}
            <label className="check"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)}/><span>Đây là địa điểm khác, tôi vẫn muốn gửi để Admin kiểm tra.</span></label>
          </div>}
        </section>
        <section className="stack-sm">
          <h2 className="contrib-section-title">Ảnh địa điểm <span className="contrib-optional">Không bắt buộc</span></h2>
          <p className="small muted">Tối đa 4 ảnh, JPEG/PNG/WebP/AVIF, tối đa 10 MB/ảnh. Ảnh đầu tiên được đề xuất làm ảnh đại diện.</p>
          <label className="contrib-upload"><UploadCloud size={23}/><span>Chọn ảnh thực tế</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={addPhotos} aria-label="Tải ảnh địa điểm" /></label>
          {previews.length > 0 && <div className="contrib-photos">{previews.map((url, index) => <div className="contrib-photo" key={url}>
            <img src={url} alt={'Ảnh đóng góp ' + (index + 1)}/>
            {index === 0 && <b>Ảnh đại diện</b>}
            <button className="contrib-remove" type="button" aria-label={'Xóa ảnh ' + (index + 1)} onClick={() => removePhoto(index)}><X size={15}/></button>
            {index > 0 && <button className="contrib-cover" type="button" onClick={() => setCover(index)}>Chọn làm bìa</button>}
          </div>)}</div>}
        </section>
        <section className="stack-sm">
          <h2 className="contrib-section-title">Thông tin thêm <span className="contrib-optional">Không bắt buộc</span></h2>
          <div className="field"><label htmlFor="contrib-description">Mô tả</label><textarea id="contrib-description" className="textarea" maxLength={3000} placeholder="Địa điểm này có gì thú vị?" value={form.description} onChange={e => update('description', e.target.value)}/></div>
          <div className="contrib-two">
            <div className="field"><label htmlFor="contrib-phone">Số điện thoại địa điểm</label><input id="contrib-phone" className="input" type="tel" maxLength={40} value={form.phone} onChange={e => update('phone', e.target.value)}/></div>
            <div className="field"><label htmlFor="contrib-hours">Giờ mở cửa</label><input id="contrib-hours" className="input" maxLength={300} placeholder="Ví dụ: 7:00 - 21:00" value={form.openingHours} onChange={e => update('openingHours', e.target.value)}/></div>
          </div>
          <div className="contrib-two">
            <div className="field"><label htmlFor="contrib-facebook">Facebook địa điểm</label><input id="contrib-facebook" className="input" type="url" maxLength={500} placeholder="https://facebook.com/..." value={form.facebookUrl} onChange={e => update("facebookUrl", e.target.value)}/></div>
            <div className="field"><label htmlFor="contrib-youtube">YouTube địa điểm</label><input id="contrib-youtube" className="input" type="url" maxLength={500} placeholder="https://youtube.com/..." value={form.youtubeUrl} onChange={e => update("youtubeUrl", e.target.value)}/></div>
          </div>
          <div className="field"><label htmlFor="contrib-contact">Số điện thoại liên hệ của bạn (chỉ Admin xem)</label><input id="contrib-contact" className="input" type="tel" maxLength={40} placeholder="Để Admin hỏi thêm nếu cần" value={form.contactPhone} onChange={e => update('contactPhone', e.target.value)}/></div>
        </section>
        <div className="contrib-assurance"><ShieldCheck size={20}/><p>Không cần đăng nhập. Địa điểm và ảnh chỉ xuất hiện công khai sau khi Admin xét duyệt. Người gửi không tự động là chủ địa điểm.</p></div>
        {error && <p className="contrib-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || Boolean(catalogError) || !categories.length || (showDuplicate && !acknowledged)}>
          {busy ? 'Đang gửi và xử lý ảnh…' : 'Gửi đóng góp'} {!busy && <ChevronRight size={19}/>}
        </button>
      </form>
      <aside className="contrib-aside">
        <div className="card stack-sm"><h3>Cùng xây dựng 11Local</h3>
          <p className="small text-2">Mỗi địa điểm bạn chia sẻ giúp người dân và du khách khám phá Cao Bằng tốt hơn.</p>
          <div className="contrib-side-line"><MapPin size={18}/><span>Địa điểm thật, ghim đúng vị trí</span></div>
          <div className="contrib-side-line"><Camera size={18}/><span>Ảnh thực tế, dễ hình dung</span></div>
          <div className="contrib-side-line"><ShieldCheck size={18}/><span>Admin duyệt trước khi công khai</span></div>
        </div>
        <div className="card"><p className="small muted">Đã gửi đóng góp trước đây?</p><Link to="/theo-doi" className="contrib-track-link">Tra cứu bằng liên kết đã lưu <ChevronRight size={15}/></Link></div>
      </aside>
    </div>
  </div>;
}

const statusLabels = { pending: 'Đang chờ Admin duyệt', needs_info: 'Cần bổ sung thông tin', approved: 'Đã duyệt', rejected: 'Đã từ chối' };
export function ContributionTracking() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [replyPhotos, setReplyPhotos] = useState([]);
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState('');
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch('/api/contributions/track?token=' + encodeURIComponent(token), { signal: controller.signal, cache: 'no-store' })
      .then(async res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(setResult)
      .catch(e => { if (e.name !== 'AbortError') setError('Không tìm thấy đóng góp hoặc liên kết không hợp lệ.'); });
    return () => controller.abort();
  }, [token, refresh]);
  const respond = async event => {
    event.preventDefault();
    if (!token || !result || replyBusy) return;
    setReplyBusy(true); setReplyError('');
    try {
      const data = new FormData();
      data.set('token', token);
      data.set('payload', JSON.stringify({ message: replyText, expectedVersion: result.version }));
      replyPhotos.forEach(photo => data.append('photos', photo));
      const response = await fetch('/api/contributions/reply', { method: 'POST', body: data });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'REPLY_UNAVAILABLE');
      setReplyText(''); setReplyPhotos([]); setRefresh(n => n + 1);
    } catch (e) {
      setReplyError({ STALE_VERSION: 'Admin đã cập nhật yêu cầu. Hãy tải lại.',
        NOT_WAITING_FOR_REPLY: 'Hồ sơ không còn chờ phản hồi.',
        TOO_MANY_PHOTOS: 'Tổng ảnh gửi không được vượt quá 4.',
        RATE_LIMITED: 'Bạn gửi quá nhanh. Hãy thử lại sau khoảng một phút.',
        DUPLICATE_SUBMISSION: 'Phản hồi tương tự vừa được gửi thành công.' }[e.message]
        || 'Không gửi được phản hồi. Hãy thử lại.');
    } finally { setReplyBusy(false); }
  };
  const addReplyPhotos = event => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    if (incoming.some(file => !allowed.includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) {
      setReplyError('Ảnh phải là JPEG, PNG, WebP hoặc AVIF dưới 10 MB.'); return;
    }
    if ((result?.photoCount || 0) + replyPhotos.length + incoming.length > 4) {
      setReplyError('Mỗi đóng góp chỉ có tối đa 4 ảnh.'); return;
    }
    setReplyPhotos(old => [...old, ...incoming]); setReplyError('');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopyStatus('Đã sao chép liên kết.'); }
    catch { setCopyStatus('Hãy sao chép địa chỉ trang trên trình duyệt.'); }
  };
  return <div className="container page form-narrow stack-lg contrib-track">
    <div className="center stack-sm"><div className="contrib-success-icon">{token ? <Check size={27}/> : <MapPin size={27}/>}</div>
      <h1>{token ? 'Theo dõi đóng góp' : 'Tra cứu đóng góp'}</h1>
      <p className="muted">{token ? 'Lưu liên kết riêng này để xem kết quả kiểm duyệt.' : 'Mở liên kết đã nhận khi gửi địa điểm để xem trạng thái.'}</p></div>
    {token && !result && !error && <p className="center muted" role="status">Đang kiểm tra trạng thái trên Neon…</p>}
    {error && <p className="contrib-error" role="alert">{error}</p>}
    {result && <section className="card stack">
      <div><span className="small muted">Mã đóng góp</span><h2>{result.trackingCode}</h2></div>
      <div><span className="small muted">Địa điểm</span><p><strong>{result.placeName}</strong></p></div>
      <div className="contrib-track-status"><CheckCircle2 size={18}/><strong>{statusLabels[result.status] || result.status}</strong></div>
      {result.decisionNote && <div className="card-flat small">Ghi chú gần nhất của Admin: {result.decisionNote}</div>}
      {result.messages?.length > 0 && <section className="stack-sm">
        <h3>Lịch sử trao đổi</h3>
        {result.messages.map((item, i) => <div className="contrib-thread-message" key={i}>
          <strong>{item.sender === 'admin' ? 'Admin 11Local' : 'Bạn'}</strong>
          <small>{new Date(item.created_at).toLocaleString('vi-VN')}</small>
          <p>{item.body}</p>
        </div>)}
      </section>}
      {result.status === 'needs_info' && <form className="stack-sm" onSubmit={respond}>
        <h3>Phản hồi yêu cầu bổ sung</h3>
        <p className="small muted">Phản hồi bằng liên kết riêng này, không cần đăng nhập. Hồ sơ sẽ quay lại hàng chờ Admin.</p>
        <label className="field" htmlFor="reply-text">Thông tin bổ sung
          <textarea id="reply-text" className="textarea" rows={4} required minLength={3} maxLength={1200}
            value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Trả lời câu hỏi của Admin…"/>
        </label>
        {(result.photoCount || 0) < 4 && <label className="contrib-upload"><UploadCloud size={20}/>
          Thêm ảnh bổ sung (tùy chọn)
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={addReplyPhotos}/>
        </label>}
        {replyPhotos.map((photo, i) => <div className="row between" key={i}>
          <span className="small">{photo.name}</span>
          <button className="btn btn-outline btn-sm" type="button" onClick={() => setReplyPhotos(old => old.filter((_, j) => j !== i))}>Bỏ</button>
        </div>)}
        {replyError && <p className="contrib-error" role="alert">{replyError}</p>}
        <button className="btn btn-primary btn-block" disabled={replyBusy}>
          {replyBusy ? 'Đang gửi…' : 'Gửi phản hồi cho Admin'}
        </button>
      </form>}
      {result.placeSlug && <Link className="btn btn-primary btn-block" to={'/ban-do?place=' + encodeURIComponent(result.placeSlug) + '&detail=1'}>Xem địa điểm đã duyệt</Link>}
      <p className="small muted">Chỉ Admin mới có thể duyệt và công khai địa điểm. Mã đóng góp không phải bằng chứng quyền sở hữu.</p>
      <button className="btn btn-primary btn-block" onClick={copy}><ClipboardCopy size={18}/> Sao chép liên kết theo dõi</button>
      {copyStatus && <p className="small" role="status">{copyStatus}</p>}
    </section>}
    <Link className="btn btn-outline btn-block" to="/dong-gop">Đóng góp địa điểm khác</Link>
  </div>;
}
