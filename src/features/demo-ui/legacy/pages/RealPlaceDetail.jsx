import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation, Phone, ShieldCheck } from 'lucide-react';
import { MapCanvas } from '../../../map/map-canvas';
import { Button, StateBlock } from '../components/ui.jsx';

/** Real approved 11Local listing. Deliberately separate from synthetic preview records. */
export function RealPlaceDetail() {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, error: false, place: null });

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ loading: true, error: false, place: null });
    fetch(`/api/places?slug=${encodeURIComponent(slug || '')}`, { signal: ctrl.signal })
      .then((res) => { if (!res.ok) throw new Error('API failed'); return res.json(); })
      .then((body) => setState({ loading: false, error: false, place: body.places?.[0] || null }))
      .catch((err) => { if (err.name !== 'AbortError') setState({ loading: false, error: true, place: null }); });
    return () => ctrl.abort();
  }, [slug]);

  if (state.loading) return <div className="container page"><p role="status">Đang tải địa điểm…</p></div>;
  if (state.error) return <div className="container page"><StateBlock kind="error" title="Không tải được địa điểm">Vui lòng thử lại sau.</StateBlock></div>;
  if (!state.place) return <div className="container page"><StateBlock kind="empty" title="Không tìm thấy địa điểm">Địa điểm chưa được duyệt hoặc không còn công khai.</StateBlock></div>;

  const p = state.place;
  const coords = `${p.latitude},${p.longitude}`;
  return (
    <div className="container page stack">
      <Link to="/ban-do" className="small muted"><ArrowLeft size={16} style={{ verticalAlign: 'middle' }} /> Trở lại bản đồ</Link>
      <div className="stack-sm">
        <h1>{p.name}</h1>
        <p className="muted">{p.category_name} · {p.area}</p>
        <p className="muted"><MapPin size={16} style={{ verticalAlign: 'middle' }} /> {p.address || 'Chưa có địa chỉ chi tiết'}</p>
        {p.ownership_status === 'verified' ? <p><ShieldCheck size={16} style={{ verticalAlign: 'middle' }} /> Đã xác minh quản lý</p> : <p className="muted">Chưa xác minh chủ địa điểm</p>}
        {p.description && <p>{p.description}</p>}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <a className="btn btn-primary" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}`} target="_blank" rel="noreferrer"><Navigation size={16} /> Chỉ đường</a>
        {p.phone && <a className="btn btn-outline" href={`tel:${p.phone}`}><Phone size={16} /> Gọi điện</a>}
        <Link to="/ban-do"><Button variant="outline">Xem bản đồ</Button></Link>
      </div>
      <div style={{ height: 340, borderRadius: 16, overflow: 'hidden' }}>
        <MapCanvas embedded onReady={(map) => {
          map.flyTo({ center: [p.longitude, p.latitude], zoom: 15 });
        }} />
      </div>
      <p className="small muted">Chỉ hiển thị thông tin địa điểm đã được Admin duyệt trên 11Local.</p>
    </div>
  );
}
