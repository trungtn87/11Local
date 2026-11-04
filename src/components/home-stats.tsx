'use client';
import { useEffect, useState } from 'react';
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
    return () => { alive = false; window.removeEventListener('11local:stats', load); };
  }, []);
  return <section className="container home-stats" aria-label="11Local qua những con số">
    <div><strong>{stats ? stats.places.toLocaleString('vi-VN') : '—'}</strong><span>Địa điểm</span></div>
    <div><strong>{stats ? stats.visits.toLocaleString('vi-VN') : '—'}</strong><span>Lượt truy cập</span></div>
    {error && <small role="status">Chưa tải được thống kê.</small>}
  </section>;
}
