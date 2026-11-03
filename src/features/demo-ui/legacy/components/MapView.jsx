import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Marker } from 'maplibre-gl';
import { LocateFixed, Minus, Navigation, Plus, X } from 'lucide-react';
import { MapCanvas } from '../../../map/map-canvas';
import { getGoogleMapsDirectionsUrl } from '../../../places/google-maps';
import { Button } from './ui.jsx';
import { RealPlaceCover } from './RealPlaceCover.jsx';

/** One map and one source of truth: the already filtered, approved Neon places. */
export function MapView({ places = [], selectedId, onSelect, full = false, onLocate, currentLocation, className = '', height }) {
  const mapRef = useRef(null);
  const [readyMap, setReadyMap] = useState(null);
  const selected = places.find((place) => place.id === selectedId);

  useEffect(() => {
    if (!readyMap) return;
    const markers = places.filter((place) => Number.isFinite(Number(place.latitude))
      && Number.isFinite(Number(place.longitude))).map((place) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.title = place.name;
      el.setAttribute('aria-label', 'Xem địa điểm ' + place.name);
      el.style.cssText = 'background:#0F766E;border:3px solid white;box-shadow:0 1px 8px #0004;border-radius:50%;width:26px;height:26px;cursor:pointer;';
      el.addEventListener('click', () => onSelect?.(place.id));
      return new Marker({ element: el })
        .setLngLat([Number(place.longitude), Number(place.latitude)])
        .addTo(readyMap);
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [readyMap, places, onSelect]);

  useEffect(() => {
    if (!readyMap || !currentLocation) return;
    const { latitude, longitude } = currentLocation;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const el = document.createElement('div');
    el.title = 'Vị trí hiện tại của bạn';
    el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#2772df;border:4px solid #fff;box-shadow:0 0 0 7px #2772df33;';
    const marker = new Marker({ element: el, anchor: 'center' })
      .setLngLat([longitude, latitude]).addTo(readyMap);
    readyMap.flyTo({ center: [longitude, latitude], zoom: Math.max(readyMap.getZoom(), 13) });
    return () => marker.remove();
  }, [readyMap, currentLocation]);

  useEffect(() => {
    if (!readyMap || !selected) return;
    readyMap.flyTo({ center: [Number(selected.longitude), Number(selected.latitude)], zoom: Math.max(readyMap.getZoom(), 12) });
  }, [readyMap, selected]);

  return <div className={'map-wrap ' + (full ? 'full ' : '') + className} style={{ height }}>
    <MapCanvas embedded onReady={(map) => { mapRef.current = map;setReadyMap(map); }}/>
    <div className="map-ctrl">
      <Button variant="outline" className="btn-icon" aria-label="Phóng to" onClick={() => mapRef.current?.zoomIn()}><Plus size={18}/></Button>
      {onLocate && <Button variant="primary" className="btn-icon" aria-label="Vị trí hiện tại" onClick={onLocate}><LocateFixed size={18}/></Button>}
      <Button variant="outline" className="btn-icon" aria-label="Thu nhỏ" onClick={() => mapRef.current?.zoomOut()}><Minus size={18}/></Button>
    </div>
    {selected && <div className="map-sheet"><div className="card row" style={{ padding: 8, gap: 10, boxShadow: 'var(--sh-3)' }}>
      <div style={{ width: 96, height: 96, flex: 'none', overflow: 'hidden', borderRadius: 12 }}><RealPlaceCover place={selected}/></div>
      <div className="grow stack-sm">
        <div className="row between"><Link to={'/dia-diem/' + selected.slug} style={{ fontWeight: 700, color: 'var(--c-text)' }}>{selected.name}</Link><button className="btn btn-ghost btn-icon btn-sm" aria-label="Đóng" onClick={() => onSelect?.(null)}><X size={16}/></button></div>
        <span className="small muted">{selected.category_name} · {selected.area}</span>
        <div className="row-wrap"><Link to={'/dia-diem/' + selected.slug} className="btn btn-primary btn-sm">Chi tiết</Link><a className="btn btn-outline btn-sm" href={getGoogleMapsDirectionsUrl(selected)} target="_blank" rel="noreferrer"><Navigation size={14}/> Chỉ đường</a></div>
      </div>
    </div></div>}
    <span className="map-badge">{places.length} địa điểm từ Neon</span>
  </div>;
}
