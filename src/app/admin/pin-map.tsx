"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map, Marker, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import styles from "./pin-map.module.css";
import { MAP_STYLE_URL } from "@/features/map/map-config";
import { isPoiLayer, loadCleanStyle, type StyleLayer } from "@/features/map/map-style";

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

type Props = {
  latitude: number;
  longitude: number;
  onChange: (longitude: number, latitude: number) => void;
};

// MapLibre's draggable marker handles both mouse and touch gestures.
// Provide our own SVG so the pin never depends on the default marker's CSS.
function createPinElement() {
  const element = document.createElement("div");
  element.className = styles.draggablePin;
  element.title = "Giữ và kéo ghim để chọn tọa độ";
  element.setAttribute("aria-label", "Ghim vị trí có thể kéo thả");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 48 60");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M24 59C19 52 5 36 5 23a19 19 0 0 1 38 0c0 13-14 29-19 36Z");
  path.setAttribute("fill", "#0f766e");
  path.setAttribute("stroke", "#fff");
  path.setAttribute("stroke-width", "3");
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "24");
  circle.setAttribute("cy", "23");
  circle.setAttribute("r", "7");
  circle.setAttribute("fill", "#fff");
  svg.append(path, circle);
  element.appendChild(svg);
  return element;
}

export function PinMap({ latitude, longitude, onChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const marker = useRef<Marker | null>(null);
  const change = useRef(onChange);
  const latest = useRef({ latitude, longitude });
  const lastMarkerSelection = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => { change.current = onChange; }, [onChange]);
  useEffect(() => { latest.current = { latitude, longitude }; }, [latitude, longitude]);

  useEffect(() => {
    let cancelled = false;
    let instance: Map | null = null;

    async function createMap() {
      const style = await loadCleanStyle(MAP_STYLE_URL);
      if (cancelled || !el.current) return;
      const start = latest.current;
      const m = new Map({
        container: el.current,
        style: style as StyleSpecification | string,
        center: [start.longitude, start.latitude],
        zoom: 14,
        dragRotate: false,
        pitchWithRotate: false,
      });
      instance = m;
      m.touchZoomRotate.disableRotation();
      m.once("load", () => {
        for (const layer of m.getStyle().layers ?? []) {
          if (isPoiLayer(layer as StyleLayer)) m.removeLayer(layer.id);
        }
      });

      const pin = new Marker({
        element: createPinElement(),
        anchor: "bottom",
        draggable: true,
      }).setLngLat([start.longitude, start.latitude]).addTo(m);

      // Only moving the marker selects coordinates. Panning/zooming the
      // basemap never silently changes the chosen location.
      pin.on("dragend", () => {
        const point = pin.getLngLat();
        lastMarkerSelection.current = { longitude: point.lng, latitude: point.lat };
        change.current(point.lng, point.lat);
      });
      marker.current = pin;
      map.current = m;
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
    const fromDrag = lastMarkerSelection.current;
    lastMarkerSelection.current = null;
    if (fromDrag &&
      Math.abs(fromDrag.latitude - latitude) < 0.0000001 &&
      Math.abs(fromDrag.longitude - longitude) < 0.0000001) return;

    // GPS and Admin-entered coordinates reposition both the marker and camera.
    pin.setLngLat([longitude, latitude]);
    m.easeTo({
      center: [longitude, latitude],
      zoom: Math.max(m.getZoom(), 14),
      duration: 350,
    });
  }, [latitude, longitude]);

  return (
    <div className={styles.frame} role="group" aria-label="Bản đồ chọn vị trí: kéo trực tiếp ghim để đặt tọa độ">
      <div ref={el} className={styles.map} />
    </div>
  );
}
