import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, Clock, ImageOff, Info, MapPin, Sparkles } from 'lucide-react';
import { useApp } from '../store.jsx';
import { Banner, CardSkeletons, StateBlock, formatAlbumDate } from '../components/ui.jsx';
import { RealPlaceCover } from '../components/RealPlaceCover.jsx';

export function Timeline() {
  const { initialPlaces, initialPlacesState } = useApp();
  const [data, setData] = useState({ status: initialPlacesState, places: initialPlaces });
  const [selectedYear, setSelectedYear] = useState('all');

  useEffect(() => {
    if (initialPlacesState !== 'loading') return;
    const controller = new AbortController();
    fetch('/api/places', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('places API failed');
        return res.json();
      })
      .then((body) => {
        setData({ status: 'ready', places: Array.isArray(body.places) ? body.places : [] });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setData({ status: 'error', places: [] });
      });
    return () => controller.abort();
  }, [initialPlacesState]);

  const timelineGroups = useMemo(() => {
    const valid = [...data.places]
      .filter((place) => Boolean(place.updated_at || place.created_at))
      .sort((a, b) => {
        const ta = Date.parse(a.updated_at || a.created_at || '') || 0;
        const tb = Date.parse(b.updated_at || b.created_at || '') || 0;
        return tb - ta;
      });

    const groups = new Map();
    for (const item of valid) {
      const ts = Date.parse(item.updated_at || item.created_at || '');
      if (!Number.isFinite(ts)) continue;
      const d = new Date(ts);
      const year = String(d.getFullYear());
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      const label = `Tháng ${d.getMonth() + 1}, ${year}`;
      if (!groups.has(key)) {
        groups.set(key, { key, year, month, label, items: [] });
      }
      groups.get(key).items.push({
        ...item,
        dateDisplay: formatAlbumDate(item.updated_at || item.created_at),
      });
    }
    return Array.from(groups.values());
  }, [data.places]);

  const years = useMemo(() => {
    const set = new Set(timelineGroups.map((g) => g.year));
    return Array.from(set);
  }, [timelineGroups]);

  const filteredGroups = useMemo(
    () => (selectedYear === 'all' ? timelineGroups : timelineGroups.filter((g) => g.year === selectedYear)),
    [timelineGroups, selectedYear],
  );

  return (
    <div className="container page stack-lg gau-timeline-page">
      <header className="gau-timeline-hero card">
        <div className="gau-timeline-hero-icon">
          <Clock size={26} />
        </div>
        <div className="grow">
          <span className="gau-hero-badge">
            <Sparkles size={13} /> Hành trình theo năm tháng
          </span>
          <h1>Gấu lớn lên</h1>
          <p className="text-2">
            Dòng thời gian lưu giữ từng dấu mốc, chuyến đi và bộ ảnh kỷ niệm của Gấu theo thời gian thực tế được cập nhật.
          </p>
        </div>
      </header>

      <Banner type="info" title="Ghi chú kỹ thuật (UI chuẩn bị):">
        Các trường dấu mốc trưởng thành chuyên biệt (độ tuổi của Gấu, loại cột mốc sinh nhật/lễ kỷ niệm riêng) đang ở trạng thái{' '}
        <b>chưa triển khai API backend riêng</b>. Dòng thời gian bên dưới chỉ hiển thị trung thực các album & kỷ niệm đã được duyệt cùng mốc ngày tháng thực tế từ cơ sở dữ liệu, không tạo dữ liệu giả lập.
      </Banner>

      {years.length > 0 && (
        <div className="row-wrap" role="group" aria-label="Lọc theo năm">
          <button
            type="button"
            className="chip"
            aria-pressed={selectedYear === 'all'}
            onClick={() => setSelectedYear('all')}
          >
            Tất cả các năm
          </button>
          {years.map((yr) => (
            <button
              key={yr}
              type="button"
              className="chip"
              aria-pressed={selectedYear === yr}
              onClick={() => setSelectedYear(yr)}
            >
              Năm {yr}
            </button>
          ))}
        </div>
      )}

      {data.status === 'loading' ? (
        <CardSkeletons n={3} label="Đang tải dòng thời gian của Gấu…" />
      ) : data.status === 'error' ? (
        <StateBlock kind="error" title="Không tải được dòng thời gian">
          Chưa thể kết nối cơ sở dữ liệu để lấy danh sách mốc thời gian thực tế.
        </StateBlock>
      ) : filteredGroups.length === 0 ? (
        <StateBlock
          title="Chưa có dấu mốc nào được công khai"
          actions={
            <Link to="/dong-gop" className="btn btn-primary">
              Cùng góp kỷ niệm đầu tiên
            </Link>
          }
        >
          Khi Admin duyệt các album và kỷ niệm mới, dấu mốc theo từng năm/tháng sẽ tự động xuất hiện tại đây.
        </StateBlock>
      ) : (
        <div className="gau-timeline-stream">
          {filteredGroups.map((group) => (
            <section key={group.key} className="gau-timeline-group" aria-label={group.label}>
              <div className="gau-timeline-month-badge">
                <Calendar size={15} />
                <span>{group.label}</span>
              </div>
              <div className="gau-timeline-items">
                {group.items.map((item) => (
                  <article key={item.id} className="gau-timeline-card card">
                    <div className="gau-timeline-thumb">
                      {item.cover_photo_id ? (
                        <RealPlaceCover place={item} />
                      ) : (
                        <div className="real-place-no-photo">
                          <ImageOff size={22} />
                          <span>Chưa có ảnh bìa</span>
                        </div>
                      )}
                    </div>
                    <div className="gau-timeline-content">
                      <div className="gau-timeline-meta">
                        {item.dateDisplay && (
                          <span className="gau-timeline-date">
                            <Calendar size={13} /> {item.dateDisplay}
                          </span>
                        )}
                        {item.category_name && (
                          <span className="badge badge-neutral">{item.category_name}</span>
                        )}
                        {item.area && (
                          <span className="xs muted">
                            <MapPin size={12} style={{ verticalAlign: 'middle' }} /> {item.area}
                          </span>
                        )}
                      </div>
                      <h3>{item.name}</h3>
                      <p className="text-2 small">
                        {item.summary || item.description || 'Kỷ niệm được lưu giữ trong album gia đình của Gấu.'}
                      </p>
                      <div className="gau-timeline-actions">
                        <Link
                          to={'/dia-diem/' + encodeURIComponent(item.slug)}
                          className="btn btn-outline btn-sm"
                        >
                          <BookOpen size={15} /> Xem album liên quan
                        </Link>
                        <Link
                          to={'/ban-do?place=' + encodeURIComponent(item.slug) + '&detail=1'}
                          className="btn btn-ghost btn-sm"
                        >
                          <MapPin size={15} /> Vị trí kỷ niệm
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
