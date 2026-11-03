import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Marker, Popup } from 'maplibre-gl';
import { ChevronLeft, ImageOff, List, MapPin, Minus, Navigation, Plus, Star, X } from 'lucide-react';

import { MapCanvas } from '../../../map/map-canvas';
import { CAO_BANG_CAMERA } from '../../../map/map-config';
import { getGoogleMapsDirectionsUrl } from '../../../places/google-maps';
import { useApp } from '../store.jsx';
import { PlaceDetailPanel } from '../components/PlaceDetailPanel.jsx';
import '../styles/map-explorer.css';

const hasCoordinates = (p) => Number.isFinite(Number(p.latitude)) &&
  Number.isFinite(Number(p.longitude)) &&
  Number(p.latitude) >= -90 && Number(p.latitude) <= 90 &&
  Number(p.longitude) >= -180 && Number(p.longitude) <= 180;

function normalized(text) {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function PlaceThumbnail({ place }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="local-map-entry-art">
      {place.cover_photo_id && !failed
        ? <img src={'/api/place-photos/' + encodeURIComponent(place.cover_photo_id)}
            loading="lazy" alt={'Ảnh đại diện ' + place.name}
            onError={() => setFailed(true)} />
        : <span className="local-map-entry-placeholder"><ImageOff size={21} /> Chưa có ảnh</span>}
    </span>
  );
}

function score(place) {
  const count = Number(place.rating_count) || 0;
  const avg = Number(place.rating_avg);
  return count > 0 && Number.isFinite(avg) ? avg.toFixed(1) + ' (' + count + ')' : 'Chưa có đánh giá';
}

function PlaceRow({ place, selected, onSelect, onOpenDetails }) {
  return (
    <article className={'local-map-entry' + (selected ? ' selected' : '')}>
      <button className="local-map-entry-main" type="button" onClick={() => onSelect(place.slug)}
        aria-pressed={selected} aria-label={'Xem ' + place.name + ' trên bản đồ'}>
        <PlaceThumbnail place={place} />
        <span className="local-map-entry-text">
          <strong>{place.name}</strong>
          <small>{place.category_name || 'Địa điểm'} · {place.area}</small>
          <span className="local-map-entry-rating"><Star size={13} /> {score(place)}</span>
        </span>
      </button>
      <div className="local-map-entry-actions">
        <button type="button" onClick={() => onOpenDetails(place.slug)}>Chi tiết</button>
        <a href={getGoogleMapsDirectionsUrl(place)} target="_blank" rel="noopener noreferrer">
          <Navigation size={14} /> Chỉ đường
        </a>
      </div>
    </article>
  );
}

function createPlacePopup(place, onOpenDetails) {
  // DOM textContent avoids HTML injection from user-contributed place fields.
  const wrapper = document.createElement('div');
  wrapper.className = 'local-map-popup';

  const category = document.createElement('span');
  category.className = 'local-map-popup-category';
  category.textContent = place.category_name || 'Địa điểm';
  wrapper.appendChild(category);

  const title = document.createElement('strong');
  title.className = 'local-map-popup-name';
  title.textContent = place.name;
  wrapper.appendChild(title);

  const address = document.createElement('p');
  address.className = 'local-map-popup-address';
  address.textContent = place.address || place.area || 'Cao Bằng';
  wrapper.appendChild(address);

  const rating = document.createElement('div');
  rating.className = 'local-map-popup-rating';
  rating.textContent = '★ ' + score(place);
  wrapper.appendChild(rating);

  const verified = document.createElement('small');
  verified.className = 'local-map-popup-verified';
  verified.textContent = place.ownership_status === 'verified'
    ? 'Đã xác minh quản lý' : 'Chưa xác minh quản lý';
  wrapper.appendChild(verified);

  const actions = document.createElement('div');
  actions.className = 'local-map-popup-actions';

  const detail = document.createElement('button');
  detail.type = 'button';
  detail.textContent = 'Chi tiết';
  detail.className = 'local-map-popup-detail';
  detail.addEventListener('click', () => onOpenDetails(place.slug));
  actions.appendChild(detail);

  const directions = document.createElement('a');
  directions.href = getGoogleMapsDirectionsUrl(place);
  directions.target = '_blank';
  directions.rel = 'noopener noreferrer';
  directions.textContent = 'Chỉ đường';
  directions.className = 'local-map-popup-directions';
  actions.appendChild(directions);

  wrapper.appendChild(actions);
  return wrapper;
}

function PlaceMap({ places, selectedPlace, onSelect, onOpenDetails }) {
  const [map, setMap] = useState(null);
  const markerRefs = useRef(new Map());

  useEffect(() => {
    if (!map) return;
    const markers = new Map();
    for (const place of places.filter(hasCoordinates)) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'local-map-pin';
      el.setAttribute('aria-label', 'Xem ' + place.name);
      el.title = place.name;
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelect(place.slug);
      });
      markers.set(place.slug, new Marker({ element: el, anchor: 'bottom' })
        .setLngLat([Number(place.longitude), Number(place.latitude)]).addTo(map));
    }
    markerRefs.current = markers;
    return () => {
      for (const marker of markers.values()) marker.remove();
      markerRefs.current = new Map();
    };
  }, [map, places, onSelect]);

  useEffect(() => {
    if (!map || !selectedPlace || !hasCoordinates(selectedPlace)) return;
    const marker = markerRefs.current.get(selectedPlace.slug);
    marker?.getElement().classList.add('selected');

    let cleanUp = false;
    const popup = new Popup({
      anchor: 'bottom',
      offset: [0, -29],
      maxWidth: '310px',
      closeButton: true,
      closeOnClick: false,
    })
      .setLngLat([Number(selectedPlace.longitude), Number(selectedPlace.latitude)])
      .setDOMContent(createPlacePopup(selectedPlace, onOpenDetails))
      .addTo(map);

    popup.on('close', () => {
      if (!cleanUp) onSelect(null);
    });

    map.easeTo({
      center: [Number(selectedPlace.longitude), Number(selectedPlace.latitude)],
      zoom: Math.min(Math.max(map.getZoom(), 14), 16),
      duration: 500,
      essential: true,
    });

    return () => {
      cleanUp = true;
      popup.remove();
      marker?.getElement().classList.remove('selected');
    };
  }, [map, selectedPlace, onSelect, onOpenDetails]);

  return (
    <div className="local-map-viewport">
      <MapCanvas embedded onReady={setMap} />
      <div className="local-map-controls">
        <button type="button" onClick={() => map?.zoomIn()} aria-label="Phóng to"><Plus size={19} /></button>
        <button type="button" onClick={() => map?.zoomOut()} aria-label="Thu nhỏ"><Minus size={19} /></button>
        <button type="button" onClick={() => {
          onSelect(null);
          map?.flyTo({ center: CAO_BANG_CAMERA.center, zoom: CAO_BANG_CAMERA.zoom });
        }} aria-label="Xem toàn Cao Bằng"><MapPin size={19} /></button>
      </div>
    </div>
  );
}

/** Real map explorer. Never mix synthetic preview places into public map pins or list. */
export function RealMapExplorer() {
  const { categories } = useApp();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ status: 'loading', places: [] });
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [showMobileList, setShowMobileList] = useState(false);
  const selectedSlug = params.get('place');
  const detailOpen = params.get('detail') === '1';

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/places', { signal: ctrl.signal, cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('API error'); return res.json(); })
      .then((body) => {
        setData({ status: 'ready', places: Array.isArray(body.places) ? body.places : [] });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setData({ status: 'error', places: [] });
      });
    return () => ctrl.abort();
  }, []);

  const onSelect = useCallback((slug) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (slug) next.set('place', slug);
      else next.delete('place');
      next.delete('detail');
      return next;
    }, { replace: true });
    setShowMobileList(false);
  }, [setParams]);

  const onOpenDetails = useCallback((slug) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('place', slug);
      next.set('detail', '1');
      return next;
    }, { replace: true });
    setShowMobileList(false);
  }, [setParams]);

  const onCloseDetails = useCallback(() => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('detail');
      return next;
    }, { replace: true });
  }, [setParams]);

  const matched = data.places.filter((place) =>
    hasCoordinates(place) &&
    (category === 'all' || category === place.category_id) &&
    (!query || normalized(place.name + ' ' + place.address + ' ' + place.area).includes(normalized(query)))
  );
  const selectedPlace = matched.find((place) => place.slug === selectedSlug) || null;

  return (
    <div className="local-map-screen">
      <div className="local-map-heading">
        <Link className="local-map-back" to="/"><ChevronLeft size={18} /> Khám phá</Link>
        <strong><MapPin size={17} /> Bản đồ Cao Bằng</strong>
        <button className="local-map-list-toggle" type="button" onClick={() => setShowMobileList((open) => !open)}
          aria-expanded={showMobileList}>
          {showMobileList ? <X size={16} /> : <List size={16} />} {showMobileList ? 'Đóng' : 'Danh sách'}
        </button>
      </div>
      <div className="local-map-categories" aria-label="Lọc theo danh mục">
        <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>Tất cả</button>
        {categories.filter((item) => item.enabled).map((item) => (
          <button type="button" key={item.id} aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}>{item.label}</button>
        ))}
      </div>

      <div className="local-map-body">
        <aside className={'local-map-sidebar' + (showMobileList ? ' open' : '')} aria-label="Danh sách địa điểm">
          <div className="local-map-sidebar-head">
            <strong>Địa điểm đã công khai</strong>
            <small>{data.status === 'ready' ? matched.length + ' địa điểm' : 'Đang tải…'}</small>
          </div>
          <label className="local-map-query">
            <span className="sr-only">Lọc theo tên hoặc địa chỉ trong 11Local</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Lọc địa điểm trong 11Local…" />
          </label>
          <div className="local-map-results">
            {data.status === 'loading' && <p role="status">Đang tải dữ liệu từ Neon…</p>}
            {data.status === 'error' && <div role="alert">Không tải được địa điểm. Hãy thử tải lại trang.</div>}
            {data.status === 'ready' && matched.length === 0 &&
              <p>Không có địa điểm đã công khai phù hợp. Hãy thử danh mục khác.</p>}
            {matched.map((place) => (
              <PlaceRow key={place.id} place={place} selected={selectedSlug === place.slug} onSelect={onSelect} onOpenDetails={onOpenDetails} />
            ))}
          </div>
        </aside>
        <div className="local-map-area">
          <PlaceMap places={matched} selectedPlace={selectedPlace} onSelect={onSelect} onOpenDetails={onOpenDetails} />
          {data.status === 'error' && <div className="local-map-alert" role="alert">Chưa kết nối được dữ liệu địa điểm.</div>}
          {data.status === 'ready' && selectedSlug && !selectedPlace &&
            <div className="local-map-alert" role="status">
              Địa điểm này chưa công khai hoặc không thuộc bộ lọc hiện tại.
              <button type="button" onClick={() => { setCategory('all'); setQuery(''); }}>Bỏ bộ lọc</button>
            </div>}
          {selectedPlace && detailOpen && (
            <PlaceDetailPanel key={selectedPlace.slug} place={selectedPlace} onClose={onCloseDetails} mode="map" />
          )}
        </div>
      </div>
    </div>
  );
}
