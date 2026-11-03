"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import { MAP_STYLE_URL } from "@/features/map/map-config";
import { isPoiLayer, loadCleanStyle, type StyleLayer } from "@/features/map/map-style";

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

type Props = {
  latitude: number;
  longitude: number;
  onChange: (longitude: number, latitude: number) => void;
};

export function PinMap({ latitude, longitude, onChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const marker = useRef<Marker | null>(null);
  const change = useRef(onChange);
  const latest = useRef({ latitude, longitude });
  const lastMapSelection = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => { change.current = onChange; }, [onChange]);
  useEffect(() => { latest.current = { latitude, longitude }; }, [latitude, longitude]);

  useEffect(() => {
    let cancelled = false;
    let instance: Map | null = null;

    async function createMap() {
      // The raw OpenFreeMap style contains POIs such as homestays and shops.
      // Use the same sanitized basemap as 11Local's public map.
      const style = await loadCleanStyle(MAP_STYLE_URL);
      if (cancelled || !el.current) return;

      const start = latest.current;
      const m = new Map({
        container: el.current,
        style: style as StyleSpecification | string,
        center: [start.longitude, start.latitude],
        zoom: 14,
      });
      instance = m;

      // Defense in depth when the style request falls back to its original URL.
      m.once("load", () => {
        for (const layer of m.getStyle().layers ?? []) {
          if (isPoiLayer(layer as StyleLayer)) m.removeLayer(layer.id);
        }
      });

      const pin = new Marker({ draggable: true })
        .setLngLat([start.longitude, start.latitude])
        .addTo(m);

      function choosePosition(longitude: number, latitude: number) {
        lastMapSelection.current = { longitude, latitude };
        change.current(longitude, latitude);
      }

      pin.on("dragend", () => {
        const p = pin.getLngLat();
        choosePosition(p.lng, p.lat);
      });
      m.on("click", (event) => {
        pin.setLngLat(event.lngLat);
        choosePosition(event.lngLat.lng, event.lngLat.lat);
      });

      map.current = m;
      marker.current = pin;
    }

    void createMap();
    return () => {
      cancelled = true;
      instance?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const pin = marker.current;
    if (!m || !pin) return;
    pin.setLngLat([longitude, latitude]);

    const fromMap = lastMapSelection.current;
    lastMapSelection.current = null;
    if (
      fromMap &&
      Math.abs(fromMap.latitude - latitude) < 0.0000001 &&
      Math.abs(fromMap.longitude - longitude) < 0.0000001
    ) return;

    m.easeTo({
      center: [longitude, latitude],
      zoom: Math.max(m.getZoom(), 14),
      duration: 350,
    });
  }, [latitude, longitude]);

  return <div ref={el} style={{ height: 360, borderRadius: 12, overflow: "hidden" }} />;
}
