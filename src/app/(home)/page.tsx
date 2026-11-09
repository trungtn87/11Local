import Link from "next/link";
import { randomInt } from "node:crypto";
import { albums } from "@/lib/family";
import { GauEmptyMascot } from "@/components/gau-mascot";
import "./home-refresh.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const albumItems = await albums();
  // A fresh set on each request, without a client timer or external image provider.
  // Only published album covers are eligible for the collage.
  const photoAlbums = albumItems.filter((album) => Boolean(album.cover_id));
  for (let i = photoAlbums.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [photoAlbums[i], photoAlbums[j]] = [photoAlbums[j], photoAlbums[i]];
  }
  const heroAlbums = photoAlbums.slice(0, 3);

  return (
    <main className="wrap home-wrap">
      <section className="hero-section gau-home-hero" aria-label="Giới thiệu Gia đình Gấu">
        <div className="hero-banner-card gau-memory-banner">
          <div className="hero-banner-copy">
            <span className="hero-eyebrow-pill">♡ Nhật ký gia đình</span>
            <h1 className="hero-banner-title">Mỗi khoảnh khắc, <span>một kỷ niệm.</span></h1>
            <p className="hero-banner-slogan">Cùng Gấu lưu giữ những ngày thật đẹp.</p>
          </div>
          <div className="gau-photo-collage" aria-label={heroAlbums.length ? "Ảnh kỷ niệm gia đình từ các album" : "Khung ảnh kỷ niệm đang chờ gia đình bổ sung"}>
            {heroAlbums.length > 0 ? heroAlbums.map((album, index) => (
              <Link href={`/album/${album.id}`} className={`gau-polaroid gau-polaroid-${index + 1}`} key={album.id} aria-label={`Xem album ${album.title}`}>
                <span className="gau-photo-tape" aria-hidden="true" />
                <img src={`/api/photos/${album.cover_id}`} alt={album.title} loading={index === 0 ? "eager" : "lazy"} />
                <span className="gau-photo-caption">{album.title}</span>
              </Link>
            )) : (
              <div className="gau-photo-placeholder">
                <GauEmptyMascot width={150} height={136} />
                <p>Chờ những bức ảnh đầu tiên của nhà Gấu ♡</p>
              </div>
            )}
            <span className="gau-collage-heart" aria-hidden="true">♡</span>
            <span className="gau-collage-sparkle" aria-hidden="true">✦</span>
          </div>
        </div>
      </section>

      {/* Album mới của Gấu */}
      <section className="albums-showcase" aria-label="Album mới của Gấu">
        <div className="section-head">
          <div className="section-head-left">
            <div className="section-title-row">
              <span className="section-icon-stack" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="6" width="16" height="13" rx="3" transform="rotate(-8 2 6)" fill="#FBE7E8" stroke="#E65359" strokeWidth="1.8" />
                  <rect x="6" y="5" width="16" height="13" rx="3" fill="#FFFFFF" stroke="#E65359" strokeWidth="2" />
                  <path d="M14 14.2s-2.5-1.6-3.3-3.1c-.6-1.2.2-2.6 1.5-2.6.8 0 1.4.4 1.8 1 .4-.6 1-1 1.8-1 1.3 0 2.1 1.4 1.5 2.6-.8 1.5-3.3 3.1-3.3 3.1z" fill="#E65359" />
                </svg>
              </span>
              <h2>
                <em>Alb</em>um mới của Gấu
              </h2>
            </div>
          </div>
          <Link href="/album" className="see-all-link">
            <span>Xem tất cả</span>
            <span aria-hidden="true">›</span>
          </Link>
        </div>

        {albumItems.length > 0 ? (
          <div className="album-carousel">
            {albumItems.slice(0, 6).map((a) => (
              <Link className="album-card" key={a.id} href={`/album/${a.id}`}>
                <div className="album-cover-wrap">
                  {a.cover_id ? (
                    <img
                      src={`/api/photos/${a.cover_id}`}
                      alt={a.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="empty-cover" aria-hidden="true">
                      <GauEmptyMascot width={76} height={70} />
                    </div>
                  )}
                  <span className="album-heart-badge" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </span>
                </div>
                <div className="card-body">
                  <div className="card-title-line">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B6A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="16" rx="3" />
                      <circle cx="8.5" cy="9.5" r="1.5" />
                      <path d="m21 15-4.5-4.5L7 20" />
                    </svg>
                    <h3>{a.title}</h3>
                  </div>
                  <p className="card-meta">
                    {a.photo_count} ảnh • {a.event_date || "Kỷ niệm gia đình"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-scrapbook">
            <GauEmptyMascot width={108} height={98} className="empty-mascot" />
            <h3>Nhà mình chưa có album nào. Hãy cùng lưu lại kỷ niệm đầu tiên nhé!</h3>
            <p>
              Những bức ảnh gia đình, chuyến đi xa và dấu mốc trưởng thành của Gấu
              sẽ hiện lên thật ấm áp tại đây.
            </p>
            <div className="empty-actions">
              <Link href="/dong-gop" className="primary">
                Cùng góp kỷ niệm
              </Link>
              <Link href="/ban-do" className="secondary">
                Xem bản đồ hành trình
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
