import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Image from "next/image";
import { BedDouble, ChevronLeft, ChevronRight, Coffee, Mountain, Navigation, ShoppingBag, Utensils, Wrench } from 'lucide-react';

import { formatApproximateDistance } from '../../../distance/distance-service';
import { getGoogleMapsDirectionsUrl } from '../../../places/google-maps';
import { selectExplorePlaces, selectHotPlaces } from '../../../places/public-place';
import { useApp } from '../store.jsx';
import { CardSkeletons, StateBlock } from '../components/ui.jsx';
import { RealPlaceCover } from '../components/RealPlaceCover.jsx';
import { HomeStats } from "@/components/home-stats";
import { PlacePopularityCompact } from "@/components/place-popularity";

const categoryIcons = { utensils: Utensils, coffee: Coffee, bed: BedDouble, mountain: Mountain, 'shopping-bag': ShoppingBag, wrench: Wrench };

export function DiscoveryHome() {
  const { setFilters, categories, categoriesState, initialPlaces, initialPlacesState } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState({ status: initialPlacesState, places: initialPlaces });

  useEffect(() => {
    if (initialPlacesState !== 'loading') return;
    const controller = new AbortController();
    fetch('/api/places', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('places API failed'); return response.json(); })
      .then((body) => setData({ status: 'ready', places: Array.isArray(body.places) ? body.places : [] }))
      .catch((error) => { if (error.name !== 'AbortError') setData({ status: 'error', places: [] }); });
    return () => controller.abort();
  }, [initialPlacesState]);

  const hot = selectHotPlaces(data.places, 12);
  const featuredFood = selectExplorePlaces(
    data.places.filter((place) => /ăn uống|ẩm thực|quán ăn|nhà hàng|cafe|cà phê|coffee|đồ uống|giải khát/i.test(
      [place.category_name, categories.find((category) => category.id === place.category_id)?.label].filter(Boolean).join(' '),
    )),
    12,
  );
  const openCategory = (id) => {
    setFilters((current) => ({ ...current, cat: id, q: '' }));
    navigate('/tim-kiem');
  };

  return (
    <div className="container page stack-lg discovery-home">
      <section className="discovery-categories" aria-labelledby="categories-heading">
        <div className="section-head"><h2 id="categories-heading">Danh mục</h2></div>
        {categoriesState === "error" && <p className="small muted">Không tải được danh mục từ Neon.</p>}
        <div className="cat-grid">
          {categories.filter((category) => category.enabled).map((category) => {
            const Icon = categoryIcons[category.icon] || Mountain;
            return (
              <button key={category.id} type="button" className="cat-item" onClick={() => openCategory(category.id)}>
                <span className="ico" aria-hidden="true">
                  {category.icon?.startsWith("custom:")
                    ? <Image className="category-photo" src={`/api/category-icons/${category.icon.slice(7)}`} alt="" width={64} height={64} unoptimized />
                    : <Icon size={30} />}
                </span>
                <span className="cat-label">{category.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="hot-heading">
        <SectionHeading id="hot-heading" title="🔥 Địa điểm hot" />
        <PlacesState data={data} places={hot} horizontal emptyMessage="Chưa có đánh giá, lượt tim hoặc lượt xem 30 ngày để xếp hạng." />
      </section>

      <section aria-labelledby="food-heading">
        <SectionHeading id="food-heading" title="🍜 Quán ăn, cafe tiêu biểu" />
        <PlacesState data={data} places={featuredFood} horizontal emptyMessage="Chưa có quán ăn hoặc cafe được công khai." />
      </section>

      <HomeStats />



    </div>
  );
}

function SectionHeading({ id, title, children }) {
  return <div className="section-head discovery-section-head"><div><h2 id={id}>{title}</h2>{children && <p className="small muted">{children}</p>}</div></div>;
}

function PlacesState({ data, places, emptyMessage, horizontal = false }) {
  const listRef = useRef(null);
  if (data.status === 'loading') return <CardSkeletons n={3} />;
  if (data.status === 'error') return <StateBlock kind="error" title="Không tải được địa điểm">Không thể kết nối dữ liệu Neon. Vui lòng thử lại sau.</StateBlock>;
  if (!places.length) return <StateBlock title="Chưa có địa điểm công khai">{emptyMessage || "Admin chưa công khai dữ liệu phù hợp cho mục này."}</StateBlock>;
  if (!horizontal) return <div className="place-grid">{places.map((place, index) => <RealPlaceCard key={place.id} place={place} priority={index === 0} />)}</div>;
  const scroll = (direction) => {
    const list = listRef.current;
    if (!list) return;
    const card = list.querySelector('.real-place-card');
    const step = card ? card.getBoundingClientRect().width + 12 : list.clientWidth;
    list.scrollBy({ left: direction * step * 2, behavior: 'smooth' });
  };
  return <div className="discovery-rail-wrap">
    <div className="discovery-rail-controls">
      <button type="button" aria-label="Xem địa điểm trước" onClick={() => scroll(-1)}><ChevronLeft size={19} /></button>
      <button type="button" aria-label="Xem địa điểm tiếp theo" onClick={() => scroll(1)}><ChevronRight size={19} /></button>
    </div>
    <div ref={listRef} className="discovery-place-rail" role="region" aria-label="Danh sách địa điểm vuốt ngang" tabIndex={0}>
      {places.map((place, index) => <RealPlaceCard key={place.id} place={place} priority={index === 0} />)}
    </div>
  </div>;
}

export function RealPlaceCard({ place, distance, onDetails, priority = false }) {
  return (
    <article className="place-card real-place-card">
      <Link to={"/ban-do?place=" + encodeURIComponent(place.slug) + "&detail=1"} className="real-place-main" aria-label={"Xem " + place.name + " trên bản đồ"}>
        <div className="pc-img"><RealPlaceCover place={place} priority={priority} /></div>
        <div className="pc-body">
          <span className="pc-name">{place.name}</span>
          <span className="pc-meta">{place.category_name} · {place.area}</span>
          {place.summary && <p className="real-place-summary">{place.summary}</p>}
          <PlacePopularityCompact place={place} />
          {distance && <span className="xs muted" title="Khoảng cách đường thẳng">{formatApproximateDistance(distance)}</span>}
        </div>
      </Link>
      <div className="real-place-actions">
        {onDetails
          ? <button className="real-place-detail-action" type="button" onClick={() => onDetails(place)}>Chi tiết</button>
          : <a className="real-place-detail-action" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              href={'/dia-diem/' + encodeURIComponent(place.slug)}>Thông tin</a>}
        <a className="real-place-direction" href={getGoogleMapsDirectionsUrl(place)} target="_blank" rel="noreferrer" aria-label={`Chỉ đường đến ${place.name}`}>
          <Navigation size={15} /> Chỉ đường
        </a>
      </div>
    </article>
  );
}
