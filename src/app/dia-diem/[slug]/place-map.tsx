"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";

import { createPlaceMarkerElement } from "@/features/map/place-marker";
import "@/features/map/place-marker.css";

const Canvas = dynamic(() => import("@/features/map/map-canvas").then((mod) => mod.MapCanvas), {
  ssr: false,
  loading: () => <div className="local-seo-map-loading" role="status">Đang tải bản đồ Cao Bằng…</div>,
});

type PublicMapPlace = {
  slug: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  latitude: number | string;
  longitude: number | string;
};

function hasValidPosition(place: { latitude: number | string; longitude: number | string }) {
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function PlaceMap({ latitude, longitude, name, slug, categoryId, categoryName }: {
  latitude: number; longitude: number; name: string; slug: string;
  categoryId?: string; categoryName?: string;
}) {
  const [map, setMap] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    if (!map || !hasValidPosition({ latitude, longitude })) return;
    let selectedMarker: MapLibreMarker | null = null;
    let cancelled = false;
    map.jumpTo({ center: [Number(longitude), Number(latitude)], zoom: 14 });
    void import("maplibre-gl").then(({ Marker }) => {
      if (cancelled) return;
      const element = createPlaceMarkerElement({ name, category_id: categoryId, category_name: categoryName });
      element.classList.add("selected");
      selectedMarker = new Marker({ element, anchor: "bottom" })
        .setLngLat([Number(longitude), Number(latitude)]).addTo(map);
    }).catch(() => {});

    return () => {
      cancelled = true;
      selectedMarker?.remove();
    };
  }, [map, latitude, longitude, name, categoryId, categoryName]);

  useEffect(() => {
    if (!map) return;
    const controller = new AbortController();
    let cancelled = false;
    const markers: MapLibreMarker[] = [];

    // Bản đồ chi tiết cũng hiển thị những địa điểm khác đã được công khai.
    void (async () => {
      try {
        const response = await fetch("/api/places", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json();
        if (!Array.isArray(body.places)) return;
        const { Marker } = await import("maplibre-gl");
        if (cancelled) return;

        for (const place of body.places as PublicMapPlace[]) {
          if (!place.slug || place.slug === slug || !hasValidPosition(place)) continue;
          const element = createPlaceMarkerElement(place);
          element.addEventListener("click", () => {
            window.location.assign("/ban-do?place=" + encodeURIComponent(place.slug) + "&detail=1");
          });
          markers.push(new Marker({ element, anchor: "bottom" })
            .setLngLat([Number(place.longitude), Number(place.latitude)]).addTo(map));
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError"))
          console.error("11Local map places unavailable", error);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      markers.forEach(marker => marker.remove());
    };
  }, [map, slug]);

  return <div className="local-seo-map-canvas" aria-label={`Bản đồ vị trí ${name}`}>
    <Canvas embedded onReady={setMap}/>
  </div>;
}
