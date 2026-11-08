import Link from "next/link";
import { notFound } from "next/navigation";
import { album } from "@/lib/family";
import { GauEmptyMascot } from "@/components/gau-mascot";

export const dynamic = "force-dynamic";

export default async function AlbumDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await album(id);
  if (!data) notFound();

  return (
    <main className="wrap">
      <div className="page-title">
        <p className="eyebrow">
          <Link href="/album">← Tất cả album của Gấu</Link>
        </p>
        <h1>{data.title}</h1>
        {data.description && <p>{data.description}</p>}
        {data.event_date && <p className="card-meta">Ngày kỷ niệm: {data.event_date}</p>}
        <Link href={`/dong-gop?album=${id}`} className="primary">
          💝 Góp ảnh vào album
        </Link>
      </div>

      {data.photos.length > 0 ? (
        <div className="photo-grid">
          {data.photos.map((p) => (
            <figure key={p.id}>
              <a href={`/api/photos/${p.id}`} target="_blank" rel="noreferrer">
                <img
                  loading="lazy"
                  src={`/api/photos/${p.id}`}
                  alt={p.caption || String(data.title)}
                />
              </a>
              <figcaption>
                {p.caption || "Kỷ niệm của Gấu"}
                <small>Đăng bởi {p.uploader_name}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="empty-scrapbook">
          <GauEmptyMascot width={104} height={96} className="empty-mascot" />
          <h3>Album đang chờ những bức ảnh kỷ niệm đầu tiên</h3>
          <p>Hãy là người đầu tiên gửi tặng Gấu bức ảnh đáng nhớ trong dịp này nhé!</p>
          <div className="empty-actions">
            <Link href={`/dong-gop?album=${id}`} className="primary">
              Góp ảnh ngay
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
