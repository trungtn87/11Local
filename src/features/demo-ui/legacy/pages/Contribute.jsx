import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookHeart, Camera, Check, CheckCircle2, ChevronRight, ClipboardCopy,
  ImagePlus, LocateFixed, LogIn, MapPin, ShieldCheck, UploadCloud, X,
} from 'lucide-react';
import { PinMap } from '../../../../app/admin/pin-map';
import { useApp } from '../store.jsx';
import { Banner } from '../components/ui.jsx';

const CENTER = { latitude: 22.6666, longitude: 106.2588 };
const EMPTY = {
  name: '',
  categoryId: '',
  address: '',
  area: 'Cao Bằng',
  description: '',
  phone: '',
  openingHours: '',
  contactPhone: '',
  facebookUrl: '',
  youtubeUrl: '',
};
const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const reasons = {
  NAME_REQUIRED: 'Hãy nhập tên album hoặc điểm kỷ niệm.',
  ADDRESS_REQUIRED: 'Hãy nhập địa chỉ hoặc mô tả nơi chụp.',
  AREA_REQUIRED: 'Hãy nhập khu vực.',
  INVALID_CATEGORY: 'Chủ đề không hợp lệ hoặc đã bị ẩn.',
  INVALID_LATITUDE: 'Hãy chọn ghim vị trí trên bản đồ.',
  INVALID_LONGITUDE: 'Vị trí trên bản đồ không hợp lệ.',
  INVALID_PHONE: 'Số điện thoại không đúng định dạng.',
  INVALID_CONTACT_PHONE: 'Số điện thoại liên hệ của bạn không đúng định dạng.',
  INVALID_IMAGE: 'Ảnh không hợp lệ. Hỗ trợ JPEG, PNG, WebP, AVIF tối đa 10 MB/ảnh.',
  TOO_MANY_PHOTOS: 'Chỉ gửi tối đa 4 ảnh mỗi lượt.',
  PHOTO_REQUIRED: 'Hãy chọn ít nhất 1 ảnh trước khi gửi.',
  REQUEST_TOO_LARGE: 'Tổng dung lượng ảnh quá lớn. Hãy chọn ảnh nhẹ hơn (dưới 10 MB/ảnh).',
  RATE_LIMITED: 'Bạn gửi quá nhanh. Hãy thử lại sau khoảng một phút.',
  DUPLICATE_SUBMISSION: 'Kỷ niệm này vừa được gửi thành công. Vui lòng kiểm tra trang theo dõi.',
  INVALID_FACEBOOK_URL: 'Liên kết Facebook phải thuộc facebook.com hoặc fb.watch.',
  INVALID_YOUTUBE_URL: 'Liên kết YouTube phải thuộc youtube.com hoặc youtu.be.',
  POSSIBLE_DUPLICATE: 'Album/địa điểm này có thể đã tồn tại. Hãy kiểm tra và xác nhận nếu thực sự khác.',
  PLACE_NOT_PUBLIC: 'Album đã chọn hiện không còn ở trạng thái công khai.',
  CONTRIBUTION_UNAVAILABLE: 'Không thể lưu đóng góp vào cơ sở dữ liệu lúc này. Vui lòng thử lại.',
};
const msg = (error) => reasons[error] || 'Không thể gửi đóng góp. Vui lòng kiểm tra kết nối và thử lại.';

export function Contribute() {
  const { currentUser, authState } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const queryAlbum = new URLSearchParams(location.search).get('album') || '';

  // Mode: 'album_photo' (UI-06 primary: contribute photos to an album) or 'new_place' (existing full place/album creation)
  const [mode, setMode] = useState('album_photo');

  // State for 'album_photo' mode (POST /api/contributions/existing with kind='photo')
  const [albums, setAlbums] = useState([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [albumNote, setAlbumNote] = useState('');
  const [albumPhotos, setAlbumPhotos] = useState([]);
  const [albumPreviews, setAlbumPreviews] = useState([]);
  const [albumError, setAlbumError] = useState('');
  const [albumBusy, setAlbumBusy] = useState(false);

  // State for 'new_place' mode (POST /api/contributions)
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

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'name') setAcknowledged(false);
  };
  const setLocation = (longitude, latitude) => {
    setPin({ latitude, longitude });
    setPinSelected(true);
    setAcknowledged(false);
    setLocationError('');
  };

  // Load published albums from /api/places
  useEffect(() => {
    const controller = new AbortController();
    setAlbumsLoading(true);
    fetch('/api/places', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((body) => {
        const list = Array.isArray(body.places) ? body.places : [];
        setAlbums(list);
        if (list.length > 0) {
          const matched = queryAlbum
            ? list.find((a) => a.slug === queryAlbum || a.id === queryAlbum)
            : list[0];
          setSelectedAlbumId((prev) => prev || matched?.id || list[0].id);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setAlbumsLoading(false);
      });
    return () => controller.abort();
  }, [queryAlbum]);

  // Load categories for new album/place creation
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/categories', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((body) => {
        const data = body.categories || [];
        setCategories(data);
        setForm((current) => ({ ...current, categoryId: current.categoryId || data[0]?.id || '' }));
        if (!data.length) setCatalogError('Hiện chưa có chủ đề công khai.');
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setCatalogError('Không lấy được danh mục thật từ cơ sở dữ liệu.');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const urls = albumPhotos.map((photo) => URL.createObjectURL(photo));
    setAlbumPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [albumPhotos]);

  useEffect(() => {
    const urls = photos.map((photo) => URL.createObjectURL(photo));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  useEffect(() => {
    if (!pinSelected || form.name.trim().length < 3) {
      setDuplicates(null);
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    setChecking(true);
    const timer = setTimeout(() => {
      const q = new URLSearchParams({
        name: form.name,
        latitude: String(pin.latitude),
        longitude: String(pin.longitude),
      });
      fetch('/api/contributions/duplicates?' + q, { signal: controller.signal, cache: 'no-store' })
        .then(async (r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then(setDuplicates)
        .catch((e) => {
          if (e.name !== 'AbortError') setDuplicates({ lookupUnavailable: true });
        })
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.name, pin.latitude, pin.longitude, pinSelected]);

  const addAlbumPhotos = (event) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    if (incoming.some((file) => !allowed.includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) {
      setAlbumError('Định dạng hoặc kích thước ảnh chưa phù hợp. Vui lòng chọn ảnh JPEG, PNG, WebP hoặc AVIF dưới 10 MB mỗi ảnh.');
      return;
    }
    if (albumPhotos.length + incoming.length > 4) {
      setAlbumError('Mỗi lượt gửi hỗ trợ tối đa 4 ảnh. Hãy xóa bớt ảnh cũ nếu muốn đổi ảnh khác.');
      return;
    }
    setAlbumPhotos((current) => [...current, ...incoming]);
    setAlbumError('');
  };

  const removeAlbumPhoto = (index) => {
    setAlbumPhotos((current) => current.filter((_, i) => i !== index));
  };

  const submitAlbumPhoto = async (event) => {
    event.preventDefault();
    if (!selectedAlbumId) {
      setAlbumError('Hãy chọn một album kỷ niệm để đóng góp ảnh.');
      return;
    }
    if (!albumPhotos.length) {
      setAlbumError('Hãy chọn ít nhất 1 bức ảnh để gửi vào album.');
      return;
    }
    setAlbumBusy(true);
    setAlbumError('');
    try {
      const data = new FormData();
      data.set(
        'payload',
        JSON.stringify({
          kind: 'photo',
          placeId: selectedAlbumId,
          note: albumNote,
        }),
      );
      albumPhotos.forEach((p) => data.append('photos', p));
      const response = await fetch('/api/contributions/existing', { method: 'POST', body: data });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const code = body?.error || (response.status === 413 ? 'REQUEST_TOO_LARGE' : 'CONTRIBUTION_UNAVAILABLE');
        throw new Error(code);
      }
      if (!body?.trackingUrl) throw new Error('CONTRIBUTION_UNAVAILABLE');
      navigate(body.trackingUrl, { replace: true });
    } catch (e) {
      setAlbumError(msg(e.message));
    } finally {
      setAlbumBusy(false);
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('Thiết bị không hỗ trợ GPS. Hãy kéo ghim trên bản đồ để chọn vị trí.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setLocation(coords.longitude, coords.latitude),
      () => setLocationError('Không lấy được GPS. Bạn vẫn có thể kéo trực tiếp ghim để chọn vị trí.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const addPhotos = (event) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    if (incoming.some((file) => !allowed.includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) {
      setError('Chỉ chọn ảnh JPEG/PNG/WebP/AVIF dưới 10 MB mỗi ảnh.');
      return;
    }
    if (photos.length + incoming.length > 4) {
      setError('Tối đa 4 ảnh cho một lần tạo mới.');
      return;
    }
    setPhotos((current) => [...current, ...incoming]);
    setError('');
  };
  const removePhoto = (index) => setPhotos((current) => current.filter((_, i) => i !== index));
  const setCover = (index) => setPhotos((current) => [current[index], ...current.filter((_, i) => i !== index)]);

  const submitNewPlace = async (event) => {
    event.preventDefault();
    if (!pinSelected) {
      setError('Hãy kéo ghim hoặc lấy vị trí GPS để xác nhận địa điểm.');
      return;
    }
    if (!categories.some((category) => category.id === form.categoryId)) {
      setError('Hãy chọn chủ đề đang hiển thị.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = new FormData();
      data.set('payload', JSON.stringify({ ...form, ...pin, acknowledgeDuplicate: acknowledged }));
      photos.forEach((photo) => data.append('photos', photo));
      const response = await fetch('/api/contributions', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok) {
        if (result.error === 'POSSIBLE_DUPLICATE') {
          setDuplicates(result);
          setAcknowledged(false);
        }
        throw new Error(result.error || 'CONTRIBUTION_UNAVAILABLE');
      }
      navigate(result.trackingUrl, { replace: true });
    } catch (e) {
      setError(msg(e.message));
    } finally {
      setBusy(false);
    }
  };

  const showDuplicate = duplicates?.hasDuplicate;

  return (
    <div className="container page contrib-page">
      <header className="contrib-hero">
        <div className="contrib-hero-icon">
          <Camera size={24} />
        </div>
        <div>
          <h1>Đăng ảnh / Cùng góp kỷ niệm</h1>
          <p>Gửi những khoảnh khắc đáng yêu của Gấu và gia đình để Admin duyệt và lưu giữ lâu dài.</p>
        </div>
      </header>

      {/* Mode Switcher */}
      <div className="seg" role="tablist" aria-label="Chọn hình thức đóng góp" style={{ marginBottom: 20 }}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'album_photo'}
          onClick={() => setMode('album_photo')}
        >
          <ImagePlus size={16} /> Góp ảnh vào Album đã có
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'new_place'}
          onClick={() => setMode('new_place')}
        >
          <MapPin size={16} /> Đề xuất Album / Điểm kỷ niệm mới
        </button>
      </div>

      <div className="contrib-layout">
        {mode === 'album_photo' ? (
          <div className="card stack contrib-form">
            {authState === 'loading' ? (
              <p className="muted" role="status">Đang kiểm tra trạng thái đăng nhập Google…</p>
            ) : !currentUser ? (
              <div className="gau-login-invite stack">
                <Banner type="warning" title="Dành cho thành viên đăng nhập Google:">
                  Theo quy định của <b>Nhà của Gấu</b>, người thân đăng nhập tài khoản Google có thể đóng góp ảnh vào các album kỷ niệm. Ảnh sẽ được Admin duyệt trước khi hiển thị công khai.
                </Banner>
                <div className="row-wrap">
                  <a
                    href="/api/auth/google/start?returnTo=%2Fdong-gop"
                    className="btn btn-accent btn-lg"
                  >
                    <LogIn size={18} /> Đăng nhập Google để góp ảnh
                  </a>
                </div>
              </div>
            ) : (
              <Banner type="success" title={`Xin chào ${currentUser.name || currentUser.email}!`}>
                Bạn đã đăng nhập Google. Hãy chọn album, tải ảnh kỷ niệm lên và thêm lời nhắn nhé.
              </Banner>
            )}

            <form className="stack" onSubmit={submitAlbumPhoto}>
              <section className="stack-sm">
                <h2 className="contrib-section-title">1. Chọn Album kỷ niệm</h2>
                <div className="field">
                  <label htmlFor="select-album">
                    Album muốn đóng góp ảnh <span className="req">*</span>
                  </label>
                  <select
                    id="select-album"
                    className="select"
                    required
                    value={selectedAlbumId}
                    onChange={(e) => setSelectedAlbumId(e.target.value)}
                    disabled={albumsLoading || albums.length === 0}
                  >
                    {albumsLoading && <option value="">Đang tải danh sách album…</option>}
                    {!albumsLoading && albums.length === 0 && (
                      <option value="">Chưa có album công khai nào — hãy chọn tab Đề xuất Album mới</option>
                    )}
                    {albums.map((album) => (
                      <option key={album.id} value={album.id}>
                        {album.name} ({album.area || 'Cao Bằng'})
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="stack-sm">
                <h2 className="contrib-section-title">2. Chọn nhiều ảnh kỷ niệm</h2>
                <p className="small muted">
                  Hỗ trợ chọn nhiều ảnh cùng lúc (tối đa 4 ảnh/lượt, định dạng JPEG/PNG/WebP/AVIF, dưới 10 MB/ảnh). Hệ thống tự động nén tối ưu khi lưu.
                </p>
                <label className="contrib-upload">
                  <UploadCloud size={26} />
                  <span>Chạm để chọn ảnh từ điện thoại hoặc máy tính</span>
                  <small className="xs muted">Đã chọn {albumPhotos.length}/4 ảnh</small>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    onChange={addAlbumPhotos}
                    aria-label="Chọn ảnh đóng góp vào album"
                  />
                </label>

                {albumPreviews.length > 0 && (
                  <div className="contrib-photos" aria-label="Xem trước ảnh đã chọn">
                    {albumPreviews.map((url, index) => (
                      <div className="contrib-photo" key={url}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Ảnh xem trước ${index + 1}`} />
                        <b>Ảnh #{index + 1}</b>
                        <button
                          className="contrib-remove"
                          type="button"
                          aria-label={`Xóa ảnh ${index + 1} khỏi danh sách`}
                          onClick={() => removeAlbumPhoto(index)}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="stack-sm">
                <h2 className="contrib-section-title">
                  3. Mô tả kỷ niệm <span className="contrib-optional">Không bắt buộc</span>
                </h2>
                <div className="field">
                  <label htmlFor="album-photo-note">Câu chuyện nhỏ hoặc thời점 chụp bức ảnh</label>
                  <textarea
                    id="album-photo-note"
                    className="textarea"
                    rows={4}
                    maxLength={1200}
                    placeholder="Ví dụ: Ảnh Gấu cười tít mắt trong chuyến đi chơi cuối tuần cùng bố mẹ…"
                    value={albumNote}
                    onChange={(e) => setAlbumNote(e.target.value)}
                  />
                </div>
              </section>

              <div className="contrib-assurance">
                <ShieldCheck size={20} />
                <div>
                  <strong>Trạng thái chờ duyệt rõ ràng:</strong>
                  <p>
                    Sau khi gửi, ảnh sẽ ở trạng thái <b>Chờ Admin duyệt</b> trước khi xuất hiện công khai trong album. Hệ thống chỉ lưu bản ảnh đã nén tối ưu, không lưu ảnh gốc dung lượng nặng.
                  </p>
                </div>
              </div>

              {albumError && (
                <p className="contrib-error" role="alert">
                  {albumError}
                </p>
              )}

              <button
                className="btn btn-primary btn-lg btn-block"
                type="submit"
                disabled={albumBusy || !selectedAlbumId || albumPhotos.length === 0}
              >
                {albumBusy ? 'Đang tải và nén ảnh lên…' : 'Gửi ảnh chờ Admin duyệt'}{' '}
                {!albumBusy && <ChevronRight size={19} />}
              </button>
            </form>
          </div>
        ) : (
          <form className="contrib-form card stack" onSubmit={submitNewPlace}>
            <section className="stack-sm">
              <h2 className="contrib-section-title">Thông tin Album / Điểm kỷ niệm mới</h2>
              <div className="field">
                <label htmlFor="contrib-name">
                  Tên album / địa điểm kỷ niệm <span className="req">*</span>
                </label>
                <input
                  id="contrib-name"
                  className="input"
                  required
                  maxLength={160}
                  placeholder="Ví dụ: Chuyến đi thác Bản Giốc mùa thu của Gấu"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="contrib-category">
                  Chủ đề / Danh mục <span className="req">*</span>
                </label>
                <select
                  id="contrib-category"
                  className="select"
                  required
                  value={form.categoryId}
                  onChange={(e) => update('categoryId', e.target.value)}
                  disabled={Boolean(catalogError)}
                >
                  {!form.categoryId && <option value="">Chọn chủ đề</option>}
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {catalogError && (
                  <p className="err-text" role="alert">
                    {catalogError}
                  </p>
                )}
              </div>
              <div className="contrib-two">
                <div className="field">
                  <label htmlFor="contrib-address">
                    Địa chỉ / nơi lưu kỷ niệm <span className="req">*</span>
                  </label>
                  <input
                    id="contrib-address"
                    className="input"
                    required
                    maxLength={500}
                    placeholder="Tên nơi chốn, đường, xã/phường..."
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="contrib-area">
                    Khu vực <span className="req">*</span>
                  </label>
                  <input
                    id="contrib-area"
                    className="input"
                    required
                    maxLength={120}
                    placeholder="Ví dụ: Cao Bằng"
                    value={form.area}
                    onChange={(e) => update('area', e.target.value)}
                  />
                </div>
              </div>
            </section>
            <section className="stack-sm">
              <div className="row between contrib-map-title">
                <h2 className="contrib-section-title">
                  Ghim vị trí chuyến đi <span className="req">*</span>
                </h2>
                <button type="button" className="btn btn-outline btn-sm" onClick={locateMe}>
                  <LocateFixed size={16} /> Vị trí của tôi
                </button>
              </div>
              <p className="small muted">
                Giữ và kéo ghim trên bản đồ để đánh dấu nơi Gấu đã ghé thăm.
              </p>
              <div className="contrib-map">
                <PinMap latitude={pin.latitude} longitude={pin.longitude} onChange={setLocation} />
              </div>
              <div className={'contrib-pin-state ' + (pinSelected ? 'selected' : '')}>
                {pinSelected ? (
                  <>
                    <CheckCircle2 size={17} /> Đã chọn vị trí trên bản đồ
                  </>
                ) : (
                  <>
                    <MapPin size={17} /> Hãy kéo ghim để xác nhận vị trí
                  </>
                )}
              </div>
              {locationError && (
                <p className="err-text" role="alert">
                  {locationError}
                </p>
              )}
              {checking && (
                <p className="small muted" role="status">
                  Đang kiểm tra các điểm kỷ niệm gần đây…
                </p>
              )}
              {duplicates?.lookupUnavailable && (
                <p className="small muted">
                  Chưa kiểm tra được trùng lặp. Admin vẫn sẽ rà soát trước khi công khai.
                </p>
              )}
              {showDuplicate && (
                <div className="contrib-warning" role="status">
                  <strong>Có thể album / địa điểm này đã tồn tại</strong>
                  {duplicates.matches?.map((place) => (
                    <div key={place.id} className="contrib-match">
                      <Link to={'/dia-diem/' + place.slug}>{place.name}</Link>
                      <span>{place.distanceMeters} m</span>
                    </div>
                  ))}
                  {duplicates.pendingNearby && (
                    <p>Đã có đóng góp cùng tên gần vị trí này đang chờ duyệt.</p>
                  )}
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                    />
                    <span>Đây là kỷ niệm khác, tôi vẫn muốn gửi để Admin kiểm tra.</span>
                  </label>
                </div>
              )}
            </section>
            <section className="stack-sm">
              <h2 className="contrib-section-title">
                Ảnh kỷ niệm <span className="contrib-optional">Tối đa 4 ảnh</span>
              </h2>
              <p className="small muted">
                Tối đa 4 ảnh, JPEG/PNG/WebP/AVIF, tối đa 10 MB/ảnh. Ảnh đầu tiên được đề xuất làm ảnh bìa.
              </p>
              <label className="contrib-upload">
                <UploadCloud size={23} />
                <span>Chọn ảnh kỷ niệm</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  onChange={addPhotos}
                  aria-label="Tải ảnh kỷ niệm"
                />
              </label>
              {previews.length > 0 && (
                <div className="contrib-photos">
                  {previews.map((url, index) => (
                    <div className="contrib-photo" key={url}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={'Ảnh đóng góp ' + (index + 1)} />
                      {index === 0 && <b>Ảnh bìa</b>}
                      <button
                        className="contrib-remove"
                        type="button"
                        aria-label={'Xóa ảnh ' + (index + 1)}
                        onClick={() => removePhoto(index)}
                      >
                        <X size={15} />
                      </button>
                      {index > 0 && (
                        <button className="contrib-cover" type="button" onClick={() => setCover(index)}>
                          Chọn làm bìa
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="stack-sm">
              <h2 className="contrib-section-title">
                Câu chuyện & Ghi chú thêm <span className="contrib-optional">Không bắt buộc</span>
              </h2>
              <div className="field">
                <label htmlFor="contrib-description">Mô tả kỷ niệm</label>
                <textarea
                  id="contrib-description"
                  className="textarea"
                  maxLength={3000}
                  placeholder="Ghi lại câu chuyện đáng nhớ của Gấu tại đây…"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>
              <div className="contrib-two">
                <div className="field">
                  <label htmlFor="contrib-phone">Số điện thoại địa điểm (nếu có)</label>
                  <input
                    id="contrib-phone"
                    className="input"
                    type="tel"
                    maxLength={40}
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="contrib-hours">Khung giờ / Thời điểm</label>
                  <input
                    id="contrib-hours"
                    className="input"
                    maxLength={300}
                    placeholder="Ví dụ: Sáng chủ nhật"
                    value={form.openingHours}
                    onChange={(e) => update('openingHours', e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="contrib-contact">Số điện thoại liên hệ của bạn (chỉ Admin xem)</label>
                <input
                  id="contrib-contact"
                  className="input"
                  type="tel"
                  maxLength={40}
                  placeholder="Để Admin hỏi thêm nếu cần"
                  value={form.contactPhone}
                  onChange={(e) => update('contactPhone', e.target.value)}
                />
              </div>
            </section>
            <div className="contrib-assurance">
              <ShieldCheck size={20} />
              <p>
                Mọi album và hình ảnh đóng góp đều ở trạng thái <b>Chờ Admin duyệt</b> trước khi xuất hiện công khai trên Nhà của Gấu.
              </p>
            </div>
            {error && (
              <p className="contrib-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="btn btn-primary btn-lg btn-block"
              type="submit"
              disabled={
                busy ||
                Boolean(catalogError) ||
                !categories.length ||
                (showDuplicate && !acknowledged)
              }
            >
              {busy ? 'Đang gửi và nén ảnh…' : 'Gửi kỷ niệm chờ duyệt'}{' '}
              {!busy && <ChevronRight size={19} />}
            </button>
          </form>
        )}

        <aside className="contrib-aside">
          <div className="card stack-sm">
            <h3>Cùng giữ gìn kỷ niệm cho Gấu</h3>
            <p className="small text-2">
              Mỗi bức ảnh của ông bà, bố mẹ và người thân gửi lên sẽ làm đầy thêm cuốn nhật ký trưởng thành của Gấu.
            </p>
            <div className="contrib-side-line">
              <BookHeart size={18} />
              <span>Chọn đúng album hoặc chuyến đi của Gấu</span>
            </div>
            <div className="contrib-side-line">
              <Camera size={18} />
              <span>Xem trước ảnh, xóa hoặc đổi trước khi gửi</span>
            </div>
            <div className="contrib-side-line">
              <ShieldCheck size={18} />
              <span>Admin duyệt cẩn thận trước khi công khai</span>
            </div>
          </div>
          <div className="card">
            <p className="small muted">Đã gửi ảnh hoặc kỷ niệm trước đây?</p>
            <Link to="/theo-doi" className="contrib-track-link">
              Tra cứu trạng thái duyệt bằng liên kết đã lưu <ChevronRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

const statusLabels = {
  pending: 'Đang chờ Admin duyệt',
  needs_info: 'Cần bổ sung thông tin',
  approved: 'Đã duyệt công khai',
  rejected: 'Đã từ chối',
};

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
    fetch('/api/contributions/track?token=' + encodeURIComponent(token), {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setResult)
      .catch((e) => {
        if (e.name !== 'AbortError') setError('Không tìm thấy đóng góp hoặc liên kết không hợp lệ.');
      });
    return () => controller.abort();
  }, [token, refresh]);

  const respond = async (event) => {
    event.preventDefault();
    if (!token || !result || replyBusy) return;
    setReplyBusy(true);
    setReplyError('');
    try {
      const data = new FormData();
      data.set('token', token);
      data.set('payload', JSON.stringify({ message: replyText, expectedVersion: result.version }));
      replyPhotos.forEach((photo) => data.append('photos', photo));
      const response = await fetch('/api/contributions/reply', { method: 'POST', body: data });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'REPLY_UNAVAILABLE');
      setReplyText('');
      setReplyPhotos([]);
      setRefresh((n) => n + 1);
    } catch (e) {
      setReplyError(
        {
          STALE_VERSION: 'Admin đã cập nhật yêu cầu. Hãy tải lại.',
          NOT_WAITING_FOR_REPLY: 'Hồ sơ không còn chờ phản hồi.',
          TOO_MANY_PHOTOS: 'Tổng ảnh gửi không được vượt quá 4.',
          RATE_LIMITED: 'Bạn gửi quá nhanh. Hãy thử lại sau khoảng một phút.',
          DUPLICATE_SUBMISSION: 'Phản hồi tương tự vừa được gửi thành công.',
        }[e.message] || 'Không gửi được phản hồi. Hãy thử lại.',
      );
    } finally {
      setReplyBusy(false);
    }
  };

  const addReplyPhotos = (event) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    if (incoming.some((file) => !allowed.includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) {
      setReplyError('Ảnh phải là JPEG, PNG, WebP hoặc AVIF dưới 10 MB.');
      return;
    }
    if ((result?.photoCount || 0) + replyPhotos.length + incoming.length > 4) {
      setReplyError('Mỗi đóng góp chỉ có tối đa 4 ảnh.');
      return;
    }
    setReplyPhotos((old) => [...old, ...incoming]);
    setReplyError('');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('Đã sao chép liên kết theo dõi.');
    } catch {
      setCopyStatus('Hãy sao chép địa chỉ trang trên trình duyệt.');
    }
  };

  return (
    <div className="container page form-narrow stack-lg contrib-track">
      <div className="center stack-sm">
        <div className="contrib-success-icon">{token ? <Check size={27} /> : <Camera size={27} />}</div>
        <h1>{token ? 'Trạng thái duyệt kỷ niệm' : 'Tra cứu kỷ niệm đã gửi'}</h1>
        <p className="muted">
          {token
            ? 'Lưu liên kết riêng này để xem kết quả khi Admin duyệt ảnh của bạn.'
            : 'Mở liên kết theo dõi đã nhận sau khi gửi ảnh để kiểm tra trạng thái duyệt.'}
        </p>
      </div>
      {token && !result && !error && (
        <p className="center muted" role="status">
          Đang kiểm tra trạng thái duyệt…
        </p>
      )}
      {error && (
        <p className="contrib-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <section className="card stack">
          <div>
            <span className="small muted">Mã theo dõi</span>
            <h2>{result.trackingCode}</h2>
          </div>
          <div>
            <span className="small muted">Album / Kỷ niệm</span>
            <p>
              <strong>{result.placeName}</strong>
            </p>
          </div>
          <div className="contrib-track-status">
            <CheckCircle2 size={18} />
            <strong>{statusLabels[result.status] || result.status}</strong>
          </div>
          {result.decisionNote && (
            <div className="card-flat small">Ghi chú từ Admin: {result.decisionNote}</div>
          )}
          {result.messages?.length > 0 && (
            <section className="stack-sm">
              <h3>Lịch sử trao đổi</h3>
              {result.messages.map((item, i) => (
                <div className="contrib-thread-message" key={i}>
                  <strong>{item.sender === 'admin' ? 'Admin Nhà của Gấu' : 'Bạn'}</strong>
                  <small>{new Date(item.created_at).toLocaleString('vi-VN')}</small>
                  <p>{item.body}</p>
                </div>
              ))}
            </section>
          )}
          {result.status === 'needs_info' && (
            <form className="stack-sm" onSubmit={respond}>
              <h3>Phản hồi bổ sung cho Admin</h3>
              <p className="small muted">
                Phản hồi bằng liên kết riêng này. Hồ sơ sẽ quay lại hàng chờ Admin duyệt.
              </p>
              <label className="field" htmlFor="reply-text">
                Thông tin bổ sung
                <textarea
                  id="reply-text"
                  className="textarea"
                  rows={4}
                  required
                  minLength={3}
                  maxLength={1200}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Trả lời câu hỏi của Admin…"
                />
              </label>
              {(result.photoCount || 0) < 4 && (
                <label className="contrib-upload">
                  <UploadCloud size={20} />
                  Thêm ảnh bổ sung (tùy chọn)
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={addReplyPhotos}
                  />
                </label>
              )}
              {replyPhotos.map((photo, i) => (
                <div className="row between" key={i}>
                  <span className="small">{photo.name}</span>
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => setReplyPhotos((old) => old.filter((_, j) => j !== i))}
                  >
                    Bỏ
                  </button>
                </div>
              ))}
              {replyError && (
                <p className="contrib-error" role="alert">
                  {replyError}
                </p>
              )}
              <button className="btn btn-primary btn-block" disabled={replyBusy}>
                {replyBusy ? 'Đang gửi…' : 'Gửi phản hồi cho Admin'}
              </button>
            </form>
          )}
          {result.placeSlug && (
            <Link
              className="btn btn-primary btn-block"
              to={'/dia-diem/' + encodeURIComponent(result.placeSlug)}
            >
              Mở Album đã duyệt
            </Link>
          )}
          <p className="small muted">
            Chỉ Admin mới có quyền duyệt và công khai hình ảnh lên Nhà của Gấu.
          </p>
          <button className="btn btn-outline btn-block" onClick={copy}>
            <ClipboardCopy size={18} /> Sao chép liên kết theo dõi
          </button>
          {copyStatus && (
            <p className="small" role="status">
              {copyStatus}
            </p>
          )}
        </section>
      )}
      <Link className="btn btn-outline btn-block" to="/dong-gop">
        Đóng góp kỷ niệm khác
      </Link>
    </div>
  );
}
