import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/family-contribution";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ảnh theo kỷ niệm | Gia đình Gấu" };

type PhotoRow = { id: string; caption: string; taken_on: string | null; album_id: string; album_title: string };
type MemoryRow = { title: string; description: string; happened_on: string | null; album_id: string | null };

export default async function MemoryPhotos({ params }: { params: Promise<{ nhom: string; id: string }> }) {
  const { nhom, id } = await params;
  const isPlace = nhom === "dia-diem";
  if ((!isPlace && nhom !== "thoi-gian") || !isUuid(id)) notFound();

  const results = isPlace
    ? await db().unsafe(`SELECT title, description, visited_on::text AS happened_on, album_id::text
      FROM family_places WHERE id::text=$1 AND kind='memory'
      AND visibility=true AND archived_at IS NULL`, [id])
    : await db().unsafe(`SELECT title, details AS description, event_date::text AS happened_on, album_id::text
      FROM family_milestones WHERE id::text=$1`, [id]);
  if (!results.length) notFound();
  const memory = results[0] as unknown as MemoryRow;

  // Use the photo's own place/milestone association, not all photos in related albums.
  const photoColumn = isPlace ? "place_id" : "milestone_id";
  const photos = await db().unsafe(`SELECT p.id::text,p.caption,p.taken_on::text,
      a.id::text AS album_id,a.title AS album_title
    FROM family_photos p JOIN family_albums a ON a.id=p.album_id AND a.archived_at IS NULL
    WHERE p.${photoColumn}::text=$1 AND p.status='approved'
    ORDER BY p.taken_on DESC NULLS LAST,p.created_at DESC`, [id]) as unknown as PhotoRow[];
  const backHref = isPlace ? "/ban-do" : "/dong-thoi-gian";

  return <main className="wrap">
    <div className="page-title">
      <p className="eyebrow"><Link href={backHref}>← {isPlace ? "Về bản đồ" : "Về cây thời gian"}</Link></p>
      <h1>{memory.title}</h1>
      {memory.happened_on && <p>📅 {memory.happened_on}</p>}
      <p>{photos.length} ảnh kỷ niệm</p>
      {memory.description && <p>{memory.description}</p>}
    </div>
    {photos.length > 0 ? <div className="photo-grid">
      {photos.map(photo => <figure key={photo.id}>
        <a href={`/api/photos/${photo.id}`} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" src={`/api/photos/${photo.id}`} alt={photo.caption || memory.title} />
        </a>
        <figcaption>
          {photo.caption || "Kỷ niệm của Gấu"}
          {photo.taken_on && <small>📅 {photo.taken_on}</small>}
          <small><Link href={`/album/${photo.album_id}`}>{photo.album_title}</Link></small>
        </figcaption>
      </figure>)}
    </div> : <div className="empty-scrapbook">
      <h2>Chưa có ảnh gắn trực tiếp với {isPlace ? "địa điểm" : "mốc thời gian"} này</h2>
      <p>Ảnh sẽ xuất hiện khi thành viên đăng ảnh và chọn đúng thông tin liên kết.</p>
      <div className="empty-actions">
        {memory.album_id && <Link className="secondary" href={`/album/${memory.album_id}`}>Xem album liên quan</Link>}
        <Link className="primary" href="/dong-gop">Góp ảnh kỷ niệm</Link>
      </div>
    </div>}
  </main>;
}
