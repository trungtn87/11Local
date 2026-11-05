"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import styles from "./pin-map.module.css";
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
  const change = useRef(onChange);
  const latest = useRef({ latitude, longitude });
  const lastMapSelection = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => { change.current = onChange; }, [onChange]);
  useEffect(() => { latest.current = { latitude, longitude }; }, [latitude, longitude]);

  useEffect(() => {
    let cancelled = false;
    let instance: Map | null = null;
    async function createMap() {
      // Sanitize POI labels: all public 11Local places must originate in Neon.
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
      m.once("load", () => {
        for (const layer of m.getStyle().layers ?? []) {
          if (isPoiLayer(layer as StyleLayer)) m.removeLayer(layer.id);
        }
      });

      // A fixed SVG overlay stays anchored to the visual map center.
      // Wait for pan inertia to finish before saving the new center.
      let dragged = false;
      m.on("dragstart", () => { dragged = true; });
      m.on("moveend", () => {
        if (!dragged) return;
        dragged = false;
        const point = m.getCenter();
        lastMapSelection.current = { longitude: point.lng, latitude: point.lat };
        change.current(point.lng, point.lat);
      });
      map.current = m;
    }
    void createMap();
    return () => {
      cancelled = true;
      instance?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const fromDrag = lastMapSelection.current;
    lastMapSelection.current = null;
    if (fromDrag &&
      Math.abs(fromDrag.latitude - latitude) < 0.0000001 &&
      Math.abs(fromDrag.longitude - longitude) < 0.0000001) return;

    m.easeTo({
      center: [longitude, latitude],
      zoom: Math.max(m.getZoom(), 14),
      duration: 350,
    });
  }, [latitude, longitude]);

  return (
    <div className={styles.frame} role="group" aria-label="Bản đồ chọn vị trí, ghim ở giữa bản đồ">
      <div ref={el} className={styles.map} />
      <svg className={styles.centerPin} viewBox="0 0 48 60" aria-hidden="true" focusable="false">
        <path d="M24 59C19 52 5 36 5 23a19 19 0 0 1 38 0c0 13-14 29-19 36Z" fill="#0f766e" stroke="#fff" strokeWidth="3" />
        <circle cx="24" cy="23" r="7" fill="#fff" />
      </svg>
    </div>
  );
}
