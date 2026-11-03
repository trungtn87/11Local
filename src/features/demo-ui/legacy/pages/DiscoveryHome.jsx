import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, Coffee, LocateFixed, MapPinOff, Mountain, Navigation, ShoppingBag, Star, Utensils, Wrench } from 'lucide-react';

import { distanceProvider, formatApproximateDistance } from '../../../distance/distance-service';
import { getGoogleMapsDirectionsUrl } from '../../../places/google-maps';
import { selectExplorePlaces, selectHotPlaces } from '../../../places/public-place';
import { useApp } from '../store.jsx';
import { Button, CardSkeletons, StateBlock } from '../components/ui.jsx';
import { RealPlaceCover } from '../components/RealPlaceCover.jsx';

const categoryIcons = { utensils: Utensils, coffee: Coffee, bed: BedDouble, mountain: Mountain, 'shopping-bag': ShoppingBag, wrench: Wrench };

function requestBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Trình duyệt không hỗ trợ vị trí.'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      reject,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  });
}

export function DiscoveryHome() {
  const { filters, setFilters, geo, setGeo, geoPosition, setGeoPosition, toast, categories } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState({ status: 'loading', places: [] });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/places', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('places API failed'); return response.json(); })
      .then((body) => setData({ status: 'ready', places: Array.isArray(body.places) ? body.places : [] }))
      .catch((error) => { if (error.name !== 'AbortError') setData({ status: 'error', places: [] }); });
    return () => controller.abort();
  }, []);

  const explore = selectExplorePlaces(data.places, 6);
  const hot = selectHotPlaces(data.places, 6);
  const nearby = geo === 'granted' && geoPosition
    ? data.places
      .map((place) => ({ place, distance: distanceProvider.calculate(geoPosition, place) }))
      .sort((a, b) => a.distance.valueMeters - b.distance.valueMeters)
      .slice(0, 6)
    : [];

  const askLocation = async () => {
    try {
      const position = await requestBrowserLocation();
      setGeoPosition(position);
      setGeo('granted');
      toast('Đã lấy vị trí hiện tại', 'success');
    } catch (error) {
      setGeo(error?.code === 1 ? 'denied' : 'off');
      toast(error?.code === 1 ? 'Quyền vị trí đang bị tắt trong trình duyệt.' : 'Chưa thể lấy vị trí hiện tại.', 'error');
    }
  };

  const openCategory = (id) => {
    setFilters((current) => ({ ...current, cat: id, q: '' }));
    navigate('/tim-kiem');
  };

  return (
    <div className="container page stack-lg discovery-home">
      <section className="discovery-categories" aria-labelledby="categories-heading">
        <div className="section-head"><h2 id="categories-heading">Danh mục</h2></div>
        <div className="cat-grid">
          {categories.filter((category) => category.enabled).map((category) => {
            const Icon = categoryIcons[category.icon] || Mountain;
            return <button key={category.id} className="cat-item" onClick={() => openCategory(category.id)}><span className="ico"><Icon size={20} /></span>{category.label}</button>;
          })}
        </div>
      </section>

      <section aria-labelledby="explore-heading">
        <SectionHeading id="explore-heading" title="Khám phá">Gợi ý từ những địa điểm mới được cập nhật trên 11Local.</SectionHeading>
        <PlacesState data={data} places={explore} />
      </section>

      <section aria-labelledby="nearby-heading">
        <SectionHeading id="nearby-heading" title="Gần bạn">Khoảng cách đường thẳng ước tính từ vị trí hiện tại.</SectionHeading>
        {geo === 'granted' && geoPosition ? (
          nearby.length
            ? <div className="place-grid">{nearby.map(({ place, distance }) => <RealPlaceCard key={place.id} place={place} distance={distance} />)}</div>
            : <StateBlock title="Chưa có địa điểm gần bạn">Chưa có địa điểm công khai để tính khoảng cách.</StateBlock>
        ) : (
          <div className="card-flat row discovery-location" style={{ flexWrap: 'wrap' }}>
            <MapPinOff size={22} className="muted" />
            <div className="grow"><b>{geo === 'denied' ? 'Quyền vị trí đang bị tắt' : 'Xem địa điểm thực sự gần bạn'}</b><div className="small text-2">11Local chỉ hiển thị khoảng cách sau khi có vị trí, không dùng quãng đường giả.</div></div>
            <Button size="sm" icon={LocateFixed} onClick={askLocation}>Dùng vị trí của tôi</Button>
          </div>
        )}
      </section>

      <section aria-labelledby="hot-heading">
        <SectionHeading id="hot-heading" title="Địa điểm hot">Những nơi được quan tâm và đánh giá tốt trên 11Local.</SectionHeading>
        <PlacesState data={data} places={hot} />
      </section>

    </div>
  );
}

function SectionHeading({ id, title, children }) {
  return <div className="section-head discovery-section-head"><div><h2 id={id}>{title}</h2><p className="small muted">{children}</p></div></div>;
}

function PlacesState({ data, places }) {
  if (data.status === 'loading') return <CardSkeletons n={3} />;
  if (data.status === 'error') return <StateBlock kind="error" title="Không tải được địa điểm">Không thể kết nối dữ liệu Neon. Vui lòng thử lại sau.</StateBlock>;
  if (!places.length) return <StateBlock title="Chưa có địa điểm công khai">Admin chưa công khai dữ liệu phù hợp cho mục này.</StateBlock>;
  return <div className="place-grid">{places.map((place) => <RealPlaceCard key={place.id} place={place} />)}</div>;
}

function RealPlaceCard({ place, distance }) {
  const ratingCount = Number(place.rating_count) || 0;
  return (
    <article className="place-card real-place-card">
      <Link to={`/dia-diem/real/${place.slug}`} className="real-place-main">
        <div className="pc-img"><RealPlaceCover place={place} /></div>
        <div className="pc-body">
          <span className="pc-name">{place.name}</span>
          <span className="pc-meta">{place.category_name} · {place.area}</span>
          <div className="row between" style={{ marginTop: 4 }}>
            <span className="rating"><Star size={14} /> {ratingCount ? `${Number(place.rating_avg).toFixed(1)} (${ratingCount})` : 'Chưa có đánh giá'}</span>
            {distance && <span className="xs muted" title="Khoảng cách đường thẳng">{formatApproximateDistance(distance)}</span>}
          </div>
        </div>
      </Link>
      <a className="real-place-direction" href={getGoogleMapsDirectionsUrl(place)} target="_blank" rel="noreferrer" aria-label={`Chỉ đường đến ${place.name}`}>
        <Navigation size={15} /> Chỉ đường
      </a>
    </article>
  );
}
