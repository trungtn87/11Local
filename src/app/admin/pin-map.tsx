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

      // Fixed centre pin: drag the MAP, not numeric fields or a far-away marker.
      // Avoid click-to-set. This also permits navigating long distances easily.
      const pin = new Marker({ draggable: false })
        .setLngLat([start.longitude, start.latitude]).addTo(m);
      pin.getElement().style.pointerEvents = "none";
      m.on("move", () => { pin.setLngLat(m.getCenter()); });
      m.on("dragend", () => {
        const point = m.getCenter();
        lastMapSelection.current = { longitude: point.lng, latitude: point.lat };
        change.current(point.lng, point.lat);
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
    const fromDrag = lastMapSelection.current;
    lastMapSelection.current = null;
    if (fromDrag &&
      Math.abs(fromDrag.latitude - latitude) < 0.0000001 &&
      Math.abs(fromDrag.longitude - longitude) < 0.0000001) return;

    pin.setLngLat([longitude, latitude]);
    m.easeTo({
      center: [longitude, latitude],
      zoom: Math.max(m.getZoom(), 14),
      duration: 350,
    });
  }, [latitude, longitude]);

  return <div ref={el} style={{ height: 360, borderRadius: 12, overflow: "hidden" }} />;
}
