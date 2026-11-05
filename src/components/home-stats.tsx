'use client';
import { useEffect, useState } from 'react';
import { Eye, MapPin } from 'lucide-react';
export function HomeStats() {
  const [stats, setStats] = useState<{places: number; visits: number} | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () => fetch('/api/stats').then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(body => { if (alive) { setStats(body); setError(false); } })
      .catch(() => { if (alive) setError(true); });
    void load();
    window.addEventListener('11local:stats', load);
    return () => { alive = false; window.removeEventLi  return (
    <section className="home-stats" aria-label="11Local qua những con số">
      <div className="home-stats-metrics">
        <div className="home-stats-item home-stats-item--places">
          <span className="home-stats-icon" aria-hidden="true"><MapPin size={28} strokeWidth={2.5} /></span>
          <div className="home-stats-copy">
            <strong>{stats ? stats.places.toLocaleString('vi-VN') : '—'}</strong>
            <span>Địa điểm</span>
          </div>
        </div>
        <div className="home-stats-item home-stats-item--visits">
          <span className="home-stats-icon" aria-hidden="true"><Eye size={28} strokeWidth={2.5} /></span>
          <div className="home-stats-copy">
            <strong>{stats ? stats.visits.toLocaleString('vi-VN') : '—'}</strong>
            <span>Lượt truy cập</span>
          </div>
        </div>
      </div>
      {error && <p className="home-stats-status" role="status">Chưa tải được thống kê.</p>}
    </section>
  );
}
