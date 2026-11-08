'use client';
import { useEffect, useState } from 'react';
import { BookHeart, Heart } from 'lucide-react';

// Display-only starting point; stored analytics remain unchanged.
const PUBLIC_VISIT_DISPLAY_BASELINE = 1000;

export function HomeStats() {
  const [stats, setStats] = useState<{ places: number; visits: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => fetch('/api/stats')
      .then((response) => {
        if (!response.ok) throw new Error('stats API failed');
        return response.json();
      })
      .then((body) => {
        if (alive) {
          setStats(body);
          setError(false);
        }
      })
      .catch(() => { if (alive) setError(true); });
    void load();
    window.addEventListener('11local:stats', load);
    return () => {
      alive = false;
      window.removeEventListener('11local:stats', load);
    };
  }, []);

  return (
    <section className="home-stats" aria-label="Nhà của Gấu qua những con số">
      <div className="home-stats-metrics">
        <div className="home-stats-item home-stats-item--places">
          <span className="home-stats-icon" aria-hidden="true"><BookHeart size={28} strokeWidth={2.3} /></span>
          <div className="home-stats-copy">
            <strong>{stats ? stats.places.toLocaleString('vi-VN') : '—'}</strong>
            <span>Album & điểm kỷ niệm</span>
          </div>
        </div>
        <div className="home-stats-item home-stats-item--visits">
          <span className="home-stats-icon" aria-hidden="true"><Heart size={28} strokeWidth={2.3} /></span>
          <div className="home-stats-copy">
            <strong>{stats ? (PUBLIC_VISIT_DISPLAY_BASELINE + stats.visits).toLocaleString('vi-VN') : '—'}</strong>
            <span>Lượt ghé thăm</span>
          </div>
        </div>
      </div>
      {error && <p className="home-stats-status" role="status">Chưa tải được thống kê thực tế.</p>}
    </section>
  );
}
