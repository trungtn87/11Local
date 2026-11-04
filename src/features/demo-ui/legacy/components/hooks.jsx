import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import { filterRealPlaces } from '../../../places/search-place';

export function useResults() {
  const { filters, geoPosition } = useApp();
  const [data, setData] = useState({ status: 'loading', places: [] });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/places', { signal: ctrl.signal, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('PLACES_UNAVAILABLE');
        return response.json();
      })
      .then((body) => {
        setData({ status: 'ready', places: Array.isArray(body.places) ? body.places : [] });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setData({ status: 'error', places: [] });
      });
    return () => ctrl.abort();
  }, [version, initialPlacesState]);

  const list = useMemo(
    () => filterRealPlaces(data.places, filters, geoPosition),
    [data.places, filters, geoPosition],
  );
  const areas = useMemo(
    () => [...new Set(data.places.map((place) => place.area).filter(Boolean))].sort((a,b) => a.localeCompare(b,'vi')),
    [data.places],
  );
  const retry = () => {
    setData({ status: 'loading', places: [] });
    setVersion((v) => v + 1);
  };
  const status = data.status === 'loading' ? 'loading'
    : data.status === 'error' ? 'error'
    : list.length === 0 ? 'empty' : 'ok';
  return { status, list, all: data.places, areas, retry };
}
