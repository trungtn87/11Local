"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  AttributionControl,
  Map,
  setWorkerUrl,
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { CAO_BANG_CAMERA, MAP_STYLE_URL } from "./map-config";
import { isPoiLayer, loadCleanStyle, type StyleLayer } from "./map-style";
import styles from "./map-canvas.module.css";

setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString(),
);

type MapCanvasProps = {
  /** Nhúng vào khung có sẵn: không có shell toàn màn hình và header thương hiệu. */
  embedded?: boolean;
  onReady?: (map: MapLibreMap) => void;
  onMoveEnd?: () => void;
};

export function MapCanvas({ embedded = false, onReady, onMoveEnd }: MapCanvasProps) {
  const onReadyRef = useRef(onReady);
  const onMoveEndRef = useRef(onMoveEnd);
  useEffect(() => {
    onReadyRef.current = onReady;
    onMoveEndRef.current = onMoveEnd;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;

    async function createMap() {
      const style = await loadCleanStyle(MAP_STYLE_URL);

      if (cancelled || !containerRef.current || mapRef.current) {
        return;
      }

      const map = new Map({
        container: containerRef.current,
        style: style as StyleSpecification | string,
        center: CAO_BANG_CAMERA.center,
        zoom: CAO_BANG_CAMERA.zoom,
        minZoom: CAO_BANG_CAMERA.minZoom,
        maxZoom: CAO_BANG_CAMERA.maxZoom,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });

      map.addControl(new AttributionControl({ compact: true }), "bottom-right");
      map.touchZoomRotate.disableRotation();
      map.once("load", () => {
        // Fallback (style URL gốc): gỡ POI sau khi tải để basemap vẫn sạch.
        if (typeof style === "string") {
          for (const layer of map.getStyle().layers) {
            if (isPoiLayer(layer as StyleLayer)) {
              map.removeLayer(layer.id);
            }
          }
        }
        setStatus("ready");
        onReadyRef.current?.(map);
      });
      map.on("moveend", (event) => {
        if (event.originalEvent) {
          onMoveEndRef.current?.();
        }
      });
      map.on("error", () => setStatus("error"));
      mapRef.current = map;
    }

    void createMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const Root = embedded ? "div" : "main";

  return (
    <Root
      className={embedded ? styles.embedded : styles.shell}
      aria-label="Bản đồ Cao Bằng"
    >
      <div ref={containerRef} className={styles.map} />

      {!embedded && (
      <header className={styles.brand} aria-label="11Local">
        <span className={styles.mark} aria-hidden="true">
          11
        </span>
        <span className={styles.wordmark}>Local</span>
        <span className={styles.location}>Cao Bằng</span>
      </header>
      )}

      {status !== "ready" && (
        <div className={styles.status} role="status" aria-live="polite">
          {status === "loading" ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Đang mở bản đồ Cao Bằng…
            </>
          ) : (
            "Chưa thể tải bản đồ. Vui lòng kiểm tra kết nối và thử lại."
          )}
        </div>
      )}
    </Root>
  );
}
