import Link from "next/link";
import { milestones } from "@/lib/family";
import { GauEmptyMascot } from "@/components/gau-mascot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gấu lớn lên | Nhà của Gấu" };

export default async function Timeline() {
  const rows = await milestones();

  return (
    <main className="wrap">
      <div className="page-title">
        <p className="eyebrow">🌱 Lớn lên cùng yêu thương</p>
        <h1>Gấu lớn lên</h1>
        <p>Những dấu mốc đặc biệt qua từng năm tháng trưởng thành của Gấu bên gia đình.</p>
      </div>

      {rows.length > 0 ? (
        <div className="timeline">
          {rows.map((m) => (
            <article key={m.id} className="memory">
              <time>{m.event_date}</time>
              <h2>{m.title}</h2>
              <p>{m.details}</p>
              {m.album_id && (
                <Link href={`/album/${m.album_id}`} className="see-all-link">
                  Xem album liên quan →
                </Link>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-scrapbook">
          <GauEmptyMascot width={108} height={98} className="empty-mascot" />
          <h3>Những cột mốc đáng nhớ của Gấu sẽ xuất hiện ở đây</h3>
          <p>
            Từ ngày đầu tiên chập chững, chuyến đi xa đầu đời cho tới mỗi mùa sinh
            nhật ấm áp bên gia đình.
          </p>
          <div className="empty-actions">
            <Link href="/album" className="primary">
              Xem Album của Gấu
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
