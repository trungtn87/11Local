"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";

const Canvas = dynamic(() => import("@/features/map/map-canvas").then((mod) => mod.MapCanvas), {
  ssr: false,
  loading: () => <div className="local-seo-map-loading" role="status">Đang tải bản đồ Cao Bằng…</div>,
});

export function PlaceMap({ latitude, longitude, name }: {
  latitude: number; longitude: number; name: string;
}) {
  const marker = useRef<MapLibreMarker | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; marker.current?.remove(); };
  }, []);

  const onReady = useCallback((map: MapLibreMap) => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    map.jumpTo({ center: [lng, lat], zoom: 14 });
    void import("maplibre-gl").then(({ Marker }) => {
      if (!alive.current) return;
      const el = document.createElement("div");
      el.className = "local-seo-map-pin";
      el.setAttribute("aria-label", name);
      marker.current?.remove();
      marker.current = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat]).addTo(map);
    }).catch(() => {});
  }, [latitude, longitude, name]);

  return <div className="local-seo-map-canvas" aria-label={`Bản đồ vị trí ${name}`}>
    <Canvas embedded onReady={onReady}/>
  </div>;
}
