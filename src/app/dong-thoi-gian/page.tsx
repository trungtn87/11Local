import Link from "next/link";
import { milestones } from "@/lib/family";
import { formatTimelineDate, groupMilestones } from "@/lib/family-timeline";
import { GauEmptyMascot } from "@/components/gau-mascot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cây thời gian của Gấu | Gia đình Gấu" };

export default async function Timeline() {
  const years = groupMilestones(await milestones());

  return (
    <main className="wrap">
      <div className="page-title">
        <p className="eyebrow">🌱 Lớn lên cùng yêu thương</p>
        <h1>Cây thời gian của Gấu</h1>
        <p>Từng năm, từng tháng và từng kỷ niệm trên hành trình lớn lên của Gấu.</p>
      </div>

      {years.length > 0 ? (
        <section className="memory-tree memory-tree-upward" aria-label="Cây thời gian kỷ niệm, mới nhất ở trên, cũ nhất ở dưới">
          <p className="tree-direction-label">↑ Gần hiện tại</p>
          {years.map((year) => (
            <details className="tree-year" key={year.year} open>
              <summary className="tree-year-summary">
                <span>Năm {year.year}</span>
                <small>{year.count} kỷ niệm</small>
              </summary>
              {year.months.map((month) => (
                <details className="tree-month" key={month.month} open>
                  <summary className="tree-month-summary">
                    <span>{month.month ? `Tháng ${month.month}` : "Chưa rõ tháng"}</span>
                    <small>{month.events.length} dấu mốc</small>
                  </summary>
                  <div className="tree-leaves">
                    {month.events.map((memory) => (
                      <article className="tree-memory" key={memory.id}>
                        <time dateTime={memory.event_date}>
                          {formatTimelineDate(memory.event_date)}
                        </time>
                        <h2>{memory.title}</h2>
                        {memory.details && <p>{memory.details}</p>}
                        {memory.album_id && (
                          <Link href={`/album/${memory.album_id}`} className="tree-album-link">
                            Xem album liên quan →
                          </Link>
                        )}
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </details>
          ))}
          <p className="tree-origin-label">🌱 Những ngày đầu tiên</p>
        </section>
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
