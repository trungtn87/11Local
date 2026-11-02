import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import { places, fold } from '../data/demo.js';

/** Lọc danh sách địa điểm (client, dữ liệu demo). Danh sách và bản đồ dùng CÙNG hàm này
 *  để kết quả thống nhất (AT03). Địa điểm bị ẩn không bao giờ xuất hiện. */
export function filterPlaces(f, hiddenIds = []) {
  const q = fold(f.q.trim());
  let list = places.filter((p) => !hiddenIds.includes(p.id));
  if (f.cat !== 'all') list = list.filter((p) => p.cat === f.cat);
  if (f.area !== 'all') list = list.filter((p) => p.area === f.area);
  if (f.verifiedOnly) list = list.filter((p) => p.managed);
  if (q) list = list.filter((p) => fold(`${p.name} ${p.address} ${p.area} ${p.desc}`).includes(q));
  const score = (p) => (fold(p.name).includes(q) ? 0 : 1);
  if (f.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  else if (f.sort === 'nearest') list = [...list].sort((a, b) => Math.hypot(a.x - 47, a.y - 58) - Math.hypot(b.x - 47, b.y - 58));
  else list = [...list].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'vi')); // tên khớp trước, rồi theo tên cho ổn định (tr.5)
  return list;
}
export const distKm = (p) => (Math.hypot(p.x - 47, p.y - 58) * 0.45).toFixed(1).replace('.', ',');

/** status: loading | ok | empty | error | offline  — mô phỏng độ trễ để xem trạng thái tải */
export function useResults() {
  const { filters, forced, hiddenIds } = useApp();
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(filters);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [key]);
  const list = useMemo(() => filterPlaces(filters, hiddenIds), [key, hiddenIds]);
  let status = 'ok';
  if (forced === 'loading' || loading) status = 'loading';
  else if (forced === 'error') status = 'error';
  else if (forced === 'offline') status = 'offline';
  else if (forced === 'empty' || list.length === 0) status = 'empty';
  return { status, list: status === 'ok' ? list : [], all: list };
}
