import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Camera, CheckCircle2, Edit3, ImagePlus, ShieldCheck, UploadCloud, X,
} from 'lucide-react';
import '../styles/existing-feedback.css';

const types = [
  { id: 'photo', label: 'Góp thêm ảnh', icon: ImagePlus, help: 'Đóng góp ảnh kỷ niệm thực tế vào album này. Ảnh sẽ được Admin duyệt trước khi hiển thị công khai.' },
  { id: 'edit_place', label: 'Đề xuất sửa nội dung', icon: Edit3, help: 'Gửi thông tin cập nhật để Admin đối chiếu trước khi áp dụng.' },
  { id: 'report', label: 'Báo thông tin sai', icon: AlertTriangle, help: 'Báo thông tin chưa chính xác hoặc bị trùng lặp.' },
];
const fields = [
  ['name', 'Tên album / địa điểm'], ['address', 'Địa chỉ'], ['area', 'Khu vực'],
  ['summary', 'Giới thiệu ngắn'], ['description', 'Mô tả'],
  ['phone', 'Số điện thoại'], ['opening_hours', 'Giờ mở cửa / Thời điểm'],
  ['website_url', 'Website'], ['facebook_url', 'Facebook'], ['youtube_url', 'YouTube'], ['price_note', 'Ghi chú chi phí'],
];
const fieldValues = {
  name: 'name', address: 'address', area: 'area', summary: 'summary',
  description: 'description', phone: 'phone', opening_hours: 'opening_hours',
  website_url: 'website_url', facebook_url: 'facebook_url', youtube_url: 'youtube_url', price_note: 'price_note',
};
const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const errors = {
  INVALID_NOTE: 'Nội dung báo cáo hoặc đề xuất cần có ít nhất 10 ký tự.',
  INVALID_VALUE: 'Giá trị đề xuất không hợp lệ.',
  INVALID_PHONE: 'Số điện thoại không hợp lệ.',
  INVALID_WEBSITE_URL: 'Đường dẫn website phải bắt đầu bằng http:// hoặc https://.',
  INVALID_IMAGE: 'Ảnh không hợp lệ. Chọn JPEG, PNG, WebP hoặc AVIF dưới 10 MB.',
  TOO_MANY_PHOTOS: 'Tối đa 4 ảnh.',
  PHOTO_REQUIRED: 'Hãy chọn ít nhất một ảnh.',
  RATE_LIMITED: 'Bạn gửi quá nhanh. Hãy thử lại sau khoảng một phút.',
  DUPLICATE_SUBMISSION: 'Đóng góp này vừa được gửi thành công. Vui lòng kiểm tra trang theo dõi.',
  INVALID_FACEBOOK_URL: 'Liên kết Facebook không hợp lệ.',
  INVALID_YOUTUBE_URL: 'Liên kết YouTube không hợp lệ.',
  PLACE_NOT_PUBLIC: 'Album/địa điểm đã ẩn hoặc không còn công khai.',
  CONTRIBUTION_UNAVAILABLE: 'Không lưu được đóng góp vào cơ sở dữ liệu. Vui lòng thử lại.',
  INVALID_ORIGIN: 'Máy chủ từ chối địa chỉ gửi. Vui lòng tải lại trang.',
  REQUEST_TOO_LARGE: 'Tổng dung lượng ảnh vượt giới hạn tải lên.',
  INVALID_PLACE: 'Mã album không hợp lệ.',
  INVALID_INPUT: 'Dữ liệu đóng góp không hợp lệ.',
};

export function ExistingPlaceFeedback() {
  const { id: slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryType = new URLSearchParams(location.search).get('loai');
  const [type, setType] = useState(types.some((t) => t.id === queryType) ? queryType : 'photo');
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('incorrect');
  const [fieldKey, setFieldKey] = useState('name');
  const [value, setValue] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    fetch('/api/places/' + encodeURIComponent(slug || '') + '/detail', {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) throw Error('Không tìm thấy album công khai.');
        return r.json();
      })
      .then((data) => {
        setPlace(data.place);
        setFieldKey('name');
        setValue(data.place?.name || '');
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setLoadError(e.message || 'Không tải được thông tin album.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    const urls = photos.map((photo) => URL.createObjectURL(photo));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  const chooseField = (key) => {
    setFieldKey(key);
    setValue(String(place?.[fieldValues[key]] || ''));
  };

  const addPhotos = (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (selected.some((p) => !allowed.includes(p.type) || !p.size || p.size > 10 * 1024 * 1024)) {
      setError('Chỉ nhận ảnh JPEG, PNG, WebP, AVIF dưới 10 MB.');
      return;
    }
    if (photos.length + selected.length > 4) {
      setError('Tối đa 4 ảnh mỗi lượt gửi.');
      return;
    }
    setPhotos((old) => [...old, ...selected]);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!place || busy) return;
    setError('');
    setBusy(true);
    try {
      const form = new FormData();
      form.set(
        'payload',
        JSON.stringify({
          kind: type,
          placeId: place.id,
          note,
          ...(type === 'report' ? { reason } : {}),
          ...(type === 'edit_place' ? { fieldKey, proposedValue: value } : {}),
        }),
      );
      if (type === 'photo') photos.forEach((p) => form.append('photos', p));
      const response = await fetch('/api/contributions/existing', { method: 'POST', body: form });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const code = body?.error || (response.status === 413 ? 'REQUEST_TOO_LARGE' : `HTTP_${response.status}`);
        throw Error(code);
      }
      if (!body?.trackingUrl) throw Error('INVALID_RESPONSE');
      navigate(body.trackingUrl, { replace: true });
    } catch (e) {
      const code = e instanceof Error ? e.message : 'UNKNOWN_ERROR';
      setError(errors[code] || `Không gửi được đóng góp (lỗi ${code}). Vui lòng thử lại.`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <p role="status">Đang tải thông tin album…</p>
      </div>
    );
  }
  if (loadError || !place) {
    return (
      <div className="container page stack">
        <p role="alert">{loadError || 'Không tìm thấy album.'}</p>
        <Link to="/tim-kiem" className="btn btn-outline">
          Về danh sách Album
        </Link>
      </div>
    );
  }

  return (
    <div className="container page stack-lg existing-feedback">
      <Link to={'/dia-diem/' + encodeURIComponent(place.slug)} className="small muted">
        <ArrowLeft size={16} /> Về trang Album “{place.name}”
      </Link>
      <header className="existing-feedback-header">
        <h1>Cùng góp kỷ niệm cho Nhà của Gấu</h1>
        <p>Đóng góp thêm hình ảnh đẹp hoặc cập nhật thông tin cho album này.</p>
        <div className="existing-feedback-place">
          <strong>{place.name}</strong>
          <span>{place.address || place.area || 'Cao Bằng'}</span>
        </div>
      </header>
      <div className="existing-feedback-layout">
        <form onSubmit={submit} className="card stack existing-feedback-form">
          <h2>Bạn muốn đóng góp nội dung gì?</h2>
          <div className="existing-feedback-tabs" role="group" aria-label="Loại đóng góp">
            {types.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => {
                  setType(t.id);
                  setError('');
                }}
                data-active={type === t.id}
              >
                <t.icon size={19} />
                {t.label}
              </button>
            ))}
          </div>
          <p className="small muted">{types.find((t) => t.id === type)?.help}</p>
          {type === 'report' && (
            <div className="field">
              <label htmlFor="feedback-reason">Vấn đề gặp phải</label>
              <select
                id="feedback-reason"
                className="select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="incorrect">Thông tin sai</option>
                <option value="closed">Địa điểm không còn hoạt động</option>
                <option value="wrong_location">Vị trí trên bản đồ không chính xác</option>
                <option value="duplicate">Album / địa điểm bị trùng</option>
                <option value="other">Vấn đề khác</option>
              </select>
            </div>
          )}
          {type === 'edit_place' && (
            <div className="stack-sm">
              <div className="field">
                <label htmlFor="feedback-field">Thông tin cần sửa</label>
                <select
                  id="feedback-field"
                  className="select"
                  value={fieldKey}
                  onChange={(e) => chooseField(e.target.value)}
                >
                  {fields.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="existing-feedback-current">
                <small>Thông tin hiện tại</small>
                <p>{place[fieldValues[fieldKey]] || 'Chưa có thông tin'}</p>
              </div>
              <div className="field">
                <label htmlFor="feedback-value">Giá trị đề xuất mới</label>
                {['description', 'summary', 'address'].includes(fieldKey) ? (
                  <textarea
                    id="feedback-value"
                    className="textarea"
                    required={fieldKey === 'name'}
                    value={value}
                    maxLength={fieldKey === 'description' ? 3000 : fieldKey === 'address' ? 500 : 350}
                    onChange={(e) => setValue(e.target.value)}
                    rows={4}
                  />
                ) : (
                  <input
                    id="feedback-value"
                    className="input"
                    value={value}
                    maxLength={
                      ['website_url', 'facebook_url', 'youtube_url'].includes(fieldKey)
                        ? 500
                        : fieldKey === 'opening_hours' || fieldKey === 'price_note'
                          ? 300
                          : 160
                    }
                    onChange={(e) => setValue(e.target.value)}
                  />
                )}
              </div>
              <p className="small muted">
                Mỗi lượt đề xuất sửa một trường để Admin dễ đối chiếu.
              </p>
            </div>
          )}
          {type === 'photo' && (
            <div className="stack-sm">
              <label className="contrib-upload">
                <UploadCloud size={23} /> Chọn ảnh kỷ niệm
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={addPhotos}
                  aria-label="Thêm ảnh kỷ niệm"
                />
              </label>
              <p className="small muted">
                Tối đa 4 ảnh, 10 MB mỗi ảnh. Hệ thống tự động nén tối ưu khi lưu.
              </p>
              <div className="existing-feedback-previews">
                {photos.map((p, i) => (
                  <div key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previews[i] || ''} alt={'Ảnh được chọn ' + (i + 1)} />
                    <button
                      type="button"
                      aria-label={'Bỏ ảnh ' + (i + 1)}
                      onClick={() => setPhotos((old) => old.filter((_, n) => n !== i))}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="feedback-note">
              {type === 'report'
                ? 'Mô tả vấn đề'
                : type === 'edit_place'
                  ? 'Lý do / ghi chú xác minh'
                  : 'Mô tả / chú thích ảnh (không bắt buộc)'}
            </label>
            <textarea
              id="feedback-note"
              className="textarea"
              rows={4}
              maxLength={1200}
              required={type !== 'photo'}
              minLength={type === 'photo' ? 0 : 10}
              placeholder={
                type === 'photo'
                  ? 'Ví dụ: Ảnh Gấu chụp cùng cả nhà tháng 11/2026'
                  : 'Mô tả chi tiết để Admin dễ dàng kiểm tra'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="contrib-assurance">
            <ShieldCheck size={20} />
            <p>
              Ảnh và nội dung đóng góp sẽ ở trạng thái <b>Chờ Admin duyệt</b> trước khi hiển thị công khai. Hãy lưu liên kết theo dõi sau khi gửi.
            </p>
          </div>
          {error && (
            <p className="contrib-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn btn-primary btn-lg btn-block"
            disabled={busy || (type === 'photo' && !photos.length)}
          >
            {busy ? 'Đang gửi đóng góp…' : 'Gửi chờ Admin duyệt'}
            <CheckCircle2 size={18} />
          </button>
        </form>
        <aside className="card existing-feedback-aside stack-sm">
          <h3>Quy trình duyệt kỷ niệm</h3>
          <p>
            <strong>1.</strong> Bạn chọn ảnh kỷ niệm hoặc thông tin muốn đóng góp.
          </p>
          <p>
            <strong>2.</strong> Admin Nhà của Gấu xem xét và có thể nhắn hỏi thêm nếu cần.
          </p>
          <p>
            <strong>3.</strong> Bạn dùng liên kết theo dõi để xem trạng thái duyệt.
          </p>
          <p>
            <strong>4.</strong> Chỉ hình ảnh đã duyệt mới xuất hiện trong album công khai.
          </p>
          <div className="existing-feedback-important">
            <Camera size={18} />
            <span>Mọi bức ảnh đều được nén tối ưu trước khi lưu trữ.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
