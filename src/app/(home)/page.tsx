import Link from "next/link";
import { albums, milestones, places } from "@/lib/family";
import { GauEmptyMascot, GauHeroIllustration } from "@/components/gau-mascot";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [albumItems, placeItems, milestoneItems] = await Promise.all([
    albums(),
    places(),
    milestones(),
  ]);

  return (
    <main className="wrap home-wrap">
      {/* B. Hero Section — Phương án 2 */}
      <section className="hero-section" aria-label="Giới thiệu Nhà của Gấu">
        <div className="hero-banner-card">
          <div className="hero-banner-copy">
            <span className="hero-eyebrow-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L14.3 9.2L21.5 11.5L14.3 13.8L12 21L9.7 13.8L2.5 11.5L9.7 9.2L12 2Z" />
              </svg>
              <span>Khám phá cuốn album gia đình</span>
            </span>

            <h1 className="hero-banner-title">Nhà của Gấu</h1>

            <p className="hero-banner-slogan">
              <span>“Nơi lưu giữ những năm tháng yêu thương.”</span>
              <svg
                className="hero-slogan-heart"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F7A7AE"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20.5s-7-4.4-9.2-8.4C1 8.6 3.2 4.5 7 4.5c2.2 0 3.8 1.2 5 2.8 1.2-1.6 2.8-2.8 5-2.8 3.8 0 6 4.1 4.2 7.6-2.2 4-9.2 8.4-9.2 8.4z" />
              </svg>
            </p>
          </div>

          <div className="hero-banner-art">
            <GauHeroIllustration className="hero-art" />
          </div>
        </div>

      </section>

      {/* C. Khám phá Nhà của Gấu — 4 Thẻ Pastel */}
      <section className="explore-section" aria-label="Khám phá Nhà của Gấu">
        <div className="feature-grid">
          <Link href="/album" className="feature-card feature-pink">
            <span className="feature-badge badge-coral" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <circle cx="8.5" cy="9.5" r="1.5" />
                <path d="m21 15-4.5-4.5L7 20" />
              </svg>
            </span>
            <h2>Album của Gấu</h2>
            <p>
              {albumItems.length > 0
                ? `${albumItems.length} cuốn album gia đình`
                : "Những khoảnh khắc yêu thương"}
            </p>
          </Link>

          <Link href="/ban-do" className="feature-card feature-green">
            <span className="feature-badge badge-green" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
            </span>
            <h2>Gấu đã đi đâu?</h2>
            <p>
              {placeItems.length > 0
                ? `${placeItems.length} điểm đến đã ghim`
                : "Bản đồ hành trình gia đình"}
            </p>
          </Link>

          <Link href="/dong-thoi-gian" className="feature-card feature-yellow">
            <span className="feature-badge badge-yellow" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15.5 14" />
              </svg>
            </span>
            <h2>Gấu lớn lên</h2>
            <p>
              {milestoneItems.length > 0
                ? `${milestoneItems.length} dấu mốc trưởng thành`
                : "Những cột mốc đáng nhớ"}
            </p>
          </Link>

          <Link href="/dong-gop" className="feature-card feature-purple">
            <span className="feature-badge badge-purple" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                <path d="M12 8v6" />
                <path d="M9 11h6" />
              </svg>
            </span>
            <h2>Cùng góp kỷ niệm</h2>
            <p>Chia sẻ ảnh cùng gia đình</p>
          </Link>
        </div>
      </section>

      {/* D. Album mới của Gấu */}
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
            <p className="section-sub">
              Những album và trang kỷ niệm vừa được cập nhật gần đây.
            </p>
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
