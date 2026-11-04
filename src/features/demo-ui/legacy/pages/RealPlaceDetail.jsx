import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation, Phone, ShieldCheck } from 'lucide-react';
import { getGoogleMapsDirectionsUrl } from '../../../places/google-maps';
import { ownershipMessage } from '../../../places/public-place-format';
import { PlaceFactSections } from '../components/PlaceFactSections.jsx';
import '../styles/place-detail-panel.css';
import { MapCanvas } from '../../../map/map-canvas';
import { Button, StateBlock } from '../components/ui.jsx';
import { RealPlaceCover } from '../components/RealPlaceCover.jsx';

/** Real approved 11Local listing. Deliberately separate from synthetic preview records. */
export function RealPlaceDetail() {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, error: false, place: null });

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ loading: true, error: false, place: null });
    fetch(`/api/places/${encodeURIComponent(slug || '')}/detail`, { signal: ctrl.signal, cache: "no-store" })
      .then((res) => { if (!res.ok) throw new Error('API failed'); return res.json(); })
      .then((body) => {
        const place = body.place || null;
        setState({ loading: false, error: false, place });
        if (place?.id) fetch(`/api/places/${encodeURIComponent(place.id)}/view`, { method: 'POST', keepalive: true }).catch(() => {});
      })
      .catch((err) => { if (err.name !== 'AbortError') setState({ loading: false, error: true, place: null }); });
    return () => ctrl.abort();
  }, [slug]);

  if (state.loading) return <div className="container page"><p role="status">Đang tải địa điểm…</p></div>;
  if (state.error) return <div className="container page"><StateBlock kind="error" title="Không tải được địa điểm">Vui lòng thử lại sau.</StateBlock></div>;
  if (!state.place) return <div className="container page"><StateBlock kind="empty" title="Không tìm thấy địa điểm">Địa điểm chưa được duyệt hoặc không còn công khai.</StateBlock></div>;

  const p = { ...state.place, cover_photo_id: state.place.photos?.[0]?.id || null };
  const ownerStatus = ownershipMessage(p.place_kind, p.ownership_status);
  return (
    <div className="container page stack">
      <Link to={"/ban-do?place=" + encodeURIComponent(p.slug)} className="small muted"><ArrowLeft size={16} style={{ verticalAlign: 'middle' }} /> Trở lại bản đồ</Link>
      <div className="real-place-detail-cover"><RealPlaceCover place={p} /></div>
      {p.photos?.length > 1 && <div className="real-v2-thumbnails">
        {p.photos.map(photo => <img key={photo.id}
          src={"/api/place-photos/" + encodeURIComponent(photo.id)}
          alt={photo.alt || ("Ảnh " + p.name)} loading="lazy"/>)}
      </div>}
      <div className="stack-sm">
        <h1>{p.name}</h1>
        {p.summary && <p className="real-v2-summary">{p.summary}</p>}
        <p className="muted">{p.category_name} · {p.area}</p>
        <p className="muted"><MapPin size={16} style={{ verticalAlign: 'middle' }} /> {p.address || 'Chưa có địa chỉ chi tiết'}</p>
        {ownerStatus && <p className="muted"><ShieldCheck size={16} style={{ verticalAlign: 'middle' }} /> {ownerStatus}</p>}
        <PlaceFactSections place={p} />
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <a className="btn btn-primary" href={getGoogleMapsDirectionsUrl(p)} target="_blank" rel="noreferrer"><Navigation size={16} /> Chỉ đường</a>
        {p.phone && <a className="btn btn-outline" href={`tel:${p.phone}`}><Phone size={16} /> Gọi điện</a>}
        <Link to={"/ban-do?place=" + encodeURIComponent(p.slug)}><Button variant="outline">Xem bản đồ</Button></Link>
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
