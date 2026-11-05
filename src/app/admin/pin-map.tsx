"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map, Marker, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import styles from "./pin-map.module.css";
import { MAP_STYLE_URL } from "@/features/map/map-config";
import { isPoiLayer, loadCleanStyle, type StyleLayer } from "@/features/map/map-style";
import { createPlaceMarkerElement } from "@/features/map/place-marker";
import { attachPlaceLabelZoom } from "@/features/map/marker-zoom";
import { parseMapReferencePlaces, type MapReferencePlace } from "@/features/map/map-reference-places";
import "@/features/map/place-marker.css";

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

type Props = {
  latitude: number;
  longitude: number;
  onChange: (longitude: number, latitude: number) => void;
  /** Admin passes every stored place; public contribution pages omit this prop. */
  referencePlaces?: MapReferencePlace[];
};

// MapLibre's draggable marker handles both mouse and touch gestures.
// Provide our own SVG so the pin never depends on the default marker's CSS.
function createPinElement() {
  const element = document.createElement("div");
  element.className = styles.draggablePin;
  // Keep the draggable edit pin above reference labels, including after async loading.
  element.style.zIndex = "10";
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

export function PinMap({ latitude, longitude, onChange, referencePlaces }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const [placesStatus, setPlacesStatus] = useState<{ state: "loading" | "ready" | "error"; count: number }>({ state: "loading", count: 0 });
  const map = useRef<Map | null>(null);
  const [readyMap, setReadyMap] = useState<Map | null>(null);
  const marker = useRef<Marker | null>(null);
  const change = useRef(onChange);
  const latest = useRef({ latitude, longitude });
  const lastMarkerSelection = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => { change.current = onChange; }, [onChange]);
  useEffect(() => { latest.current = { latitude, longitude }; }, [latitude, longitude]);

  useEffect(() => {
    let cancelled = false;
    let instance: Map | null = null;
    let detachLabels: (() => void) | null = null;

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
      detachLabels = attachPlaceLabelZoom(m);
      m.touchZoomRotate.disableRotation();
      m.once("load", () => {
        for (const layer of m.getStyle().layers ?? []) {
          if (isPoiLayer(layer as StyleLayer)) m.removeLayer(layer.id);
        }
        setReadyMap(m);
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
      detachLabels?.();
      instance?.remove();
      setReadyMap(null);
      map.current = null;
      marker.current = null;
    };
  }, []);

  // Unlike the public contribution form, Admin supplies its own complete
  // protected catalog (including pending and hidden locations).
  // Rebuild just reference pins when that catalog changes, never the draggable pin.
  useEffect(() => {
    if (!readyMap) return;
    let cancelled = false;
    const controller = new AbortController();
    const referenceMarkers: Marker[] = [];
    void (async () => {
      try {
        let places = referencePlaces;
        if (places === undefined) {
          const response = await fetch("/api/places", {
            cache: "no-store", signal: controller.signal,
          });
          if (!response.ok) throw new Error("PLACES_UNAVAILABLE");
          const body: unknown = await response.json();
          places = parseMapReferencePlaces(body);
        }
        if (cancelled) return;
        for (const place of places) {
          const element = createPlaceMarkerElement(place);
          element.classList.add(styles.referencePin);
          element.setAttribute("aria-hidden", "true");
          element.tabIndex = -1;
          element.style.pointerEvents = "none";
          element.style.zIndex = "1";
          if (referencePlaces !== undefined &&
              (place.moderation_status !== "approved" || place.visibility === "hidden")) {
            element.style.opacity = "0.72";
            element.title = place.name + " (chưa công khai)";
          }
          referenceMarkers.push(new Marker({ element, anchor: "bottom" })
            .setLngLat([place.longitude, place.latitude]).addTo(readyMap));
        }
        setPlacesStatus({ state: "ready", count: referenceMarkers.length });
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === "AbortError")) {
          setPlacesStatus({ state: "error", count: 0 });
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      for (const referenceMarker of referenceMarkers) referenceMarker.remove();
    };
  }, [readyMap, referencePlaces]);

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
      <p className={styles.referenceStatus} role="status" aria-live="polite">
        {placesStatus.state === "loading" ? "Đang tải địa điểm đã có trên 11Local…"
          : placesStatus.state === "error" ? "Không tải được địa điểm đã có; ghim xanh vẫn hoạt động."
          : placesStatus.count === 0 ? (referencePlaces !== undefined
              ? "Admin chưa có địa điểm lưu trong Neon." : "Chưa có địa điểm đã công khai để hiển thị.")
          : `${placesStatus.count} địa điểm ${referencePlaces === undefined ? "đã công khai" : "đã lưu trong Admin"} · Ghim xanh là vị trí mới`}
      </p>
    </div>
  );
}
