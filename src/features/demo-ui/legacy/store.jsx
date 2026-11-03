import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { adminQueue as seedQueue, claims as seedClaims, myContributions as seedContribs } from './data/demo.js';

// Trạng thái GIAO DIỆN thuần (in-memory). Không có xác thực, API hay database.
// "role" chỉ là công tắc xem trước giao diện — KHÔNG phải quyền thật (xem PreviewTools).
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const defaultFilters = { q: '', cat: 'all', area: 'all', verifiedOnly: false, openNowOnly: false, sort: 'relevance' };

export function AppProvider({ children }) {
  const qs = new URLSearchParams(window.location.search); // ?role=admin&state=error — chỉ tiện xem thử giao diện
  const [role, setRole] = useState(['guest', 'member', 'owner', 'admin'].includes(qs.get('role')) ? qs.get('role') : 'guest'); // guest | member | owner | admin
  const [filters, setFilters] = useState(defaultFilters); // giữ nguyên khi chuyển danh sách <-> bản đồ (v1 tr.4)
  const [forced, setForced] = useState(qs.get('state') || 'none'); // none | loading | empty | error | offline
  const [toasts, setToasts] = useState([]);
  const [queue, setQueue] = useState(seedQueue);
  const [claims, setClaims] = useState(seedClaims);
  const [contribs, setContribs] = useState(seedContribs);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [myReviews, setMyReviews] = useState({}); // placeId -> {stars,text,status}
  const [favs, setFavs] = useState([]);
  const [geo, setGeo] = useState('off'); // off | granted | denied
  const [geoPosition, setGeoPosition] = useState(null); // { latitude, longitude, accuracy }
  const tid = useRef(0);

  const toast = useCallback((msg, type = 'success') => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const value = useMemo(() => ({
    role, setRole, filters, setFilters, resetFilters: () => setFilters(defaultFilters),
    forced, setForced, toasts, toast, queue, setQueue, claims, setClaims,
    contribs, addContrib: (c) => setContribs((l) => [c, ...l]),
    hiddenIds, setHiddenIds, myReviews, setMyReviews, favs,
    toggleFav: (id) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    geo, setGeo, geoPosition, setGeoPosition,
  }), [role, filters, forced, toasts, toast, queue, claims, contribs, hiddenIds, myReviews, favs, geo, geoPosition]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Mã tra cứu DEMO — không phải cơ chế bảo mật thật (v1 tr.7: mã thật phải khó đoán, sinh phía máy chủ)
export const demoCode = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = (n) => Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join('');
  return `DEMO-${r(4)}-${r(4)}`;
};
