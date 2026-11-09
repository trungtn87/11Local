import Link from "next/link";
import { albums } from "@/lib/family";
import { GauEmptyMascot } from "@/components/gau-mascot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Album của Gấu | Gia đình Gấu" };

export default async function Albums({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [items, query] = await Promise.all([albums(), searchParams]);
  const q = (query.q || "").trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.description || "").toLowerCase().includes(q) ||
          (a.event_date || "").toLowerCase().includes(q),
      )
    : items;

  return (
    <main className="wrap">
      <div className="page-title">
        <p className="eyebrow">🖼️ Những câu chuyện bằng hình ảnh</p>
        <h1>Album của Gấu</h1>
        <p>
          Ai cũng có thể cùng xem những cuốn album gia đình. Thành viên đăng nhập
          Google có thể đóng góp thêm ảnh kỷ niệm.
        </p>
        {q && (
          <p className="search-filter-tag">
            Đang lọc theo từ khóa: <strong>“{query.q}”</strong> ·{" "}
            <Link href="/album">Xem tất cả</Link>
          </p>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="album-grid">
          {filtered.map((a) => (
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
                  <h2>{a.title}</h2>
                </div>
                <p className="card-meta">
                  {a.photo_count} ảnh • {a.event_date || "Kỷ niệm gia đình"}
                </p>
                {a.description && <small>{a.description}</small>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-scrapbook">
          <GauEmptyMascot width={108} height={98} className="empty-mascot" />
          <h3>
            {q
              ? `Không tìm thấy album nào khớp với “${query.q}”`
              : "Nhà mình chưa có album nào. Hãy cùng lưu lại kỷ niệm đầu tiên nhé!"}
          </h3>
          <p>
            {q
              ? "Thử tìm với một từ khóa khác hoặc xem toàn bộ các cuốn album của Gấu."
              : "Khi có album mới được tạo, bìa ảnh và số lượng ảnh sẽ hiển thị tại đây."}
          </p>
          <div className="empty-actions">
            {q ? (
              <Link href="/album" className="primary">
                Xem tất cả album
              </Link>
            ) : (
              <Link href="/dong-gop" className="primary">
                Cùng góp kỷ niệm
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
