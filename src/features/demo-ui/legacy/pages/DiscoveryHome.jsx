import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Image from 'next/image';
import {
  BedDouble, BookHeart, Camera, ChevronLeft, ChevronRight, Clock, Coffee,
  HeartHandshake, Map as MapIcon, Mountain, Sparkles, Utensils, Wrench,
} from 'lucide-react';

import { formatApproximateDistance } from '../../../distance/distance-service';
import { selectExplorePlaces, selectHotPlaces } from '../../../places/public-place';
import { useApp } from '../store.jsx';
import { AlbumCard, CardSkeletons, StateBlock } from '../components/ui.jsx';
import { GauHeroIllustration } from '@/components/gau-mascot';
import { HomeStats } from '@/components/home-stats';

const categoryIcons = {
  utensils: Utensils,
  coffee: Coffee,
  bed: BedDouble,
  mountain: Mountain,
  'shopping-bag': BookHeart,
  wrench: Wrench,
};

export function DiscoveryHome() {
  const { setFilters, categories, categoriesState, initialPlaces, initialPlacesState } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState({ status: initialPlacesState, places: initialPlaces });

  useEffect(() => {
    if (initialPlacesState !== 'loading') return;
    const controller = new AbortController();
    fetch('/api/places', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('places API failed');
        return response.json();
      })
      .then((body) => setData({ status: 'ready', places: Array.isArray(body.places) ? body.places : [] }))
      .catch((error) => {
        if (error.name !== 'AbortError') setData({ status: 'error', places: [] });
      });
    return () => controller.abort();
  }, [initialPlacesState]);

  const newestAlbums = selectExplorePlaces(data.places, 12);
  const recentTrips = selectExplorePlaces(
    data.places.filter(
      (place) =>
        Number.isFinite(Number(place.latitude)) &&
        Number.isFinite(Number(place.longitude)),
    ),
    12,
  );
  const featuredMemories = selectHotPlaces(data.places, 12);
  const highlightedMemories = featuredMemories.length ? featuredMemories : newestAlbums.slice(0, 8);

  const openCategory = (id) => {
    setFilters((current) => ({ ...current, cat: id, q: '' }));
    navigate('/tim-kiem');
  };

  return (
    <div className="container page stack-lg discovery-home">
      {/* Hero Section — Nhà của Gấu */}
      <section className="gau-hero" aria-labelledby="gau-hero-title">
        <div className="gau-hero-copy">
          <span className="gau-hero-badge">
            <Sparkles size={14} aria-hidden="true" /> Khám phá cuốn album gia đình
          </span>
          <h1 id="gau-hero-title">Nhà của Gấu</h1>
          <p className="gau-hero-slogan">“Nơi lưu giữ những năm tháng yêu thương.”</p>
          <p className="gau-hero-desc">
            Góc nhỏ ấm áp lưu lại từng bức ảnh, chuyến đi xa và những cột mốc trưởng thành đáng nhớ của Gấu bên gia đình.
          </p>
          <div className="gau-hero-actions">
            <Link to="/tim-kiem" className="btn btn-primary">
              <BookHeart size={18} /> Xem Album của Gấu
            </Link>
            <Link to="/dong-gop" className="btn btn-accent">
              <Camera size={18} /> Cùng góp kỷ niệm
            </Link>
          </div>
        </div>
        <div className="gau-hero-art">
          <GauHeroIllustration className="gau-hero-svg" />
        </div>
      </section>

      {/* Four Mandatory Pillar Cards: Album của Gấu, Gấu đã đi đâu?, Gấu lớn lên, Cùng góp kỷ niệm */}
      <section aria-labelledby="pillars-heading" className="gau-pillars-section">
        <div className="section-head">
          <h2 id="pillars-heading">Khám phá Nhà của Gấu</h2>
          <span className="small muted">Chạm nhẹ để mở từng ngăn ký ức</span>
        </div>
        <div className="gau-pillars-grid">
          <Link to="/tim-kiem" className="gau-pillar-card gau-pillar-card--honey">
            <span className="gau-pillar-icon" aria-hidden="true">
              <BookHeart size={26} />
            </span>
            <div className="gau-pillar-body">
              <h3>Album của Gấu</h3>
              <p>Những bộ ảnh gia đình, khoảnh khắc đời thường và ngày vui bên nhau.</p>
            </div>
          </Link>

          <Link to="/ban-do" className="gau-pillar-card gau-pillar-card--sage">
            <span className="gau-pillar-icon" aria-hidden="true">
              <MapIcon size={26} />
            </span>
            <div className="gau-pillar-body">
              <h3>Gấu đã đi đâu?</h3>
              <p>Bản đồ đánh dấu những vùng đất, điểm đến mà Gấu và cả nhà đã ghé thăm.</p>
            </div>
          </Link>

          <Link to="/dong-thoi-gian" className="gau-pillar-card gau-pillar-card--cream">
            <span className="gau-pillar-icon" aria-hidden="true">
              <Clock size={26} />
            </span>
            <div className="gau-pillar-body">
              <h3>Gấu lớn lên</h3>
              <p>Dòng thời gian theo từng năm tháng ghi lại hành trình khôn lớn của Gấu.</p>
            </div>
          </Link>

          <Link to="/dong-gop" className="gau-pillar-card gau-pillar-card--red">
            <span className="gau-pillar-icon" aria-hidden="true">
              <HeartHandshake size={26} />
            </span>
            <div className="gau-pillar-body">
              <h3>Cùng góp kỷ niệm</h3>
              <p>Gửi thêm bức ảnh đẹp của Gấu để Admin duyệt và lưu vào album chung.</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Category Filter Shortcuts (if categories are configured in DB) */}
      {categories.some((category) => category.enabled) && (
        <section className="discovery-categories" aria-labelledby="categories-heading">
          <div className="section-head">
            <h2 id="categories-heading">Chủ đề kỷ niệm</h2>
            <Link to="/tim-kiem">Xem tất cả album</Link>
          </div>
          {categoriesState === 'error' && (
            <p className="small muted">Chưa tải được danh sách chủ đề từ máy chủ.</p>
          )}
          <div className="cat-grid">
            {categories
              .filter((category) => category.enabled)
              .map((category) => {
                const Icon = categoryIcons[category.icon] || Mountain;
                return (
                  <button
                    key={category.id}
                    type="button"
                    className="cat-item"
                    onClick={() => openCategory(category.id)}
                  >
                    <span className="ico" aria-hidden="true">
                      {category.icon?.startsWith('custom:') ? (
                        <Image
                          className="category-photo"
                          src={`/api/category-icons/${category.icon.slice(7)}`}
                          alt=""
                          width={64}
                          height={64}
                          unoptimized
                        />
                      ) : (
                        <Icon size={28} />
                      )}
                    </span>
                    <span className="cat-label">{category.label}</span>
                  </button>
                );
              })}
          </div>
        </section>
      )}

      {/* Section 1: Album mới */}
      <section aria-labelledby="new-albums-heading">
        <SectionHeading
          id="new-albums-heading"
          title="📒 Album mới của Gấu"
          actionLink="/tim-kiem"
          actionLabel="Xem tất cả"
        >
          Những album và trang kỷ niệm vừa được cập nhật gần đây.
        </SectionHeading>
        <PlacesState
          data={data}
          places={newestAlbums}
          horizontal
          emptyMessage="Chưa có album công khai nào. Hãy quay lại khi Admin cập nhật kỷ niệm mới nhé!"
        />
      </section>

      {/* Section 2: Chuyến đi gần đây */}
      <section aria-labelledby="recent-trips-heading">
        <SectionHeading
          id="recent-trips-heading"
          title="🗺️ Chuyến đi gần đây"
          actionLink="/ban-do"
          actionLabel="Mở bản đồ"
        >
          Theo dấu chân Gấu qua những địa điểm gắn liền với kỷ niệm gia đình.
        </SectionHeading>
        <PlacesState
          data={data}
          places={recentTrips}
          horizontal
          emptyMessage="Chưa có chuyến đi nào được gắn tọa độ trên bản đồ."
        />
      </section>

      {/* Section 3: Ảnh kỷ niệm nổi bật */}
      <section aria-labelledby="featured-memories-heading">
        <SectionHeading
          id="featured-memories-heading"
          title="🍯 Ảnh & kỷ niệm nổi bật"
          actionLink="/dong-thoi-gian"
          actionLabel="Xem dòng thời gian"
        >
          Những khoảnh khắc được người thân yêu thích và ghé xem nhiều nhất.
        </SectionHeading>
        <PlacesState
          data={data}
          places={highlightedMemories}
          horizontal
          emptyMessage="Chưa có ảnh kỷ niệm nổi bật nào được công khai."
        />
      </section>

      <HomeStats />
    </div>
  );
}

function SectionHeading({ id, title, children, actionLink, actionLabel }) {
  return (
    <div className="section-head discovery-section-head">
      <div>
        <h2 id={id}>{title}</h2>
        {children && <p className="small muted">{children}</p>}
      </div>
      {actionLink && <Link to={actionLink}>{actionLabel}</Link>}
    </div>
  );
}

function PlacesState({ data, places, emptyMessage, horizontal = false }) {
  const listRef = useRef(null);
  if (data.status === 'loading') return <CardSkeletons n={3} />;
  if (data.status === 'error') {
    return (
      <StateBlock kind="error" title="Chưa tải được album kỷ niệm">
        Không thể kết nối cơ sở dữ liệu lúc này. Vui lòng thử lại sau.
      </StateBlock>
    );
  }
  if (!places.length) {
    return (
      <StateBlock title="Chưa có kỷ niệm công khai">
        {emptyMessage || 'Admin chưa công khai dữ liệu phù hợp cho mục này.'}
      </StateBlock>
    );
  }
  if (!horizontal) {
    return (
      <div className="place-grid">
        {places.map((place, index) => (
          <RealPlaceCard key={place.id} place={place} priority={index === 0} />
        ))}
      </div>
    );
  }
  const scroll = (direction) => {
    const list = listRef.current;
    if (!list) return;
    const card = list.querySelector('.real-place-card');
    const step = card ? card.getBoundingClientRect().width + 12 : list.clientWidth;
    list.scrollBy({ left: direction * step * 2, behavior: 'smooth' });
  };
  return (
    <div className="discovery-rail-wrap">
      <div className="discovery-rail-controls">
        <button type="button" aria-label="Xem kỷ niệm trước" onClick={() => scroll(-1)}>
          <ChevronLeft size={19} />
        </button>
        <button type="button" aria-label="Xem kỷ niệm tiếp theo" onClick={() => scroll(1)}>
          <ChevronRight size={19} />
        </button>
      </div>
      <div
        ref={listRef}
        className="discovery-place-rail"
        role="region"
        aria-label="Danh sách album kỷ niệm vuốt ngang"
        tabIndex={0}
      >
        {places.map((place, index) => (
          <RealPlaceCard key={place.id} place={place} priority={index === 0} />
        ))}
      </div>
    </div>
  );
}

export function RealPlaceCard({ place, distance, onDetails, priority = false }) {
  return (
    <AlbumCard
      place={place}
      priority={priority}
      onDetails={onDetails}
      distanceLabel={distance ? formatApproximateDistance(distance) : undefined}
    />
  );
}
