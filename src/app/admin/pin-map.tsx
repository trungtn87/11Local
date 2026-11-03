"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, setWorkerUrl } from "maplibre-gl";
import { MAP_STYLE_URL } from "@/features/map/map-config";

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
  const initial = useRef({ latitude, longitude });
  const lastMapSelection = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => { change.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!el.current) return;
    const start = initial.current;
    const m = new Map({
      container: el.current,
      style: MAP_STYLE_URL,
      center: [start.longitude, start.latitude],
      zoom: 14,
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
    return () => {
      m.remove();
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

    // Manual coordinates, search results, or selecting a different place:
    // move the camera as well as the marker so the new position is visible.
    m.easeTo({
      center: [longitude, latitude],
      zoom: Math.max(m.getZoom(), 14),
      duration: 350,
    });
  }, [latitude, longitude]);

  return <div ref={el} style={{ height: 360, borderRadius: 12, overflow: "hidden" }} />;
}
