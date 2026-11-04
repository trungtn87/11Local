import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const Context = createContext(null);
export const useApp = () => useContext(Context);

const defaultFilters = {
  q: '', cat: 'all', area: 'all', verifiedOnly: false, openNowOnly: false, sort: 'relevance',
};

export function AppProvider({ children }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [categories, setCategories] = useState([]);
  const [categoriesState, setCategoriesState] = useState('loading');
  const [currentUser, setCurrentUser] = useState(null);
  const [authState, setAuthState] = useState('loading');
  const [geo, setGeo] = useState('off');
  const [geoPosition, setGeoPosition] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/categories', { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error('CATEGORIES_UNAVAILABLE'); return response.json(); })
      .then((body) => {
        if (!Array.isArray(body.categories)) throw new Error('INVALID_CATEGORIES');
        setCategories(body.categories.map((row) => ({
          id: row.id, label: row.name, icon: row.icon,
          sortOrder: row.sort_order, enabled: true,
        })));
        setCategoriesState('ready');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setCategoriesState('error');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error('SESSION_UNAVAILABLE'); return response.json(); })
      .then((body) => {
        setCurrentUser(body.authenticated ? body.user : null);
        setAuthState('ready');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setAuthState('error');
      });
    return () => controller.abort();
  }, []);

  const toast = useCallback((message, type = 'success') => {
    const id = ++toastId.current;
    setToasts((items) => [...items, { id, msg: message, type }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3600);
  }, []);
  const resetFilters = useCallback(() => setFilters(defaultFilters), []);
  const value = useMemo(() => ({
    filters, setFilters, resetFilters,
    categories, categoriesState, currentUser, setCurrentUser, authState,
    geo, setGeo, geoPosition, setGeoPosition, toasts, toast,
    initialPlaces, initialPlacesState,
  }), [filters, resetFilters, categories, categoriesState, currentUser, authState, geo, geoPosition, toasts, toast, initialPlaces, initialPlacesState]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
