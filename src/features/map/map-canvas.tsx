"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import {
  AttributionControl,
  Map,
  setWorkerUrl,
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

import { CAO_BANG_CAMERA, MAP_STYLE_URL } from "./map-config";
import { loadFullStyle } from "./map-style";
import styles from "./map-canvas.module.css";

// Restore the worker bundle handling used by the working 11Local map.
// Next standalone builds need an explicit URL for the MapLibre worker.
setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString(),
);

type MapStatus = "loading" | "ready" | "error";

export function MapCanvas({
  embedded = false,
  onReady,
}: {
  embedded?: boolean;
  onReady?: (map: MapLibreMap) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let didLoad = false;

    async function createMap() {
      try {
        const style = await loadFullStyle(MAP_STYLE_URL);
        if (cancelled || !containerRef.current) return;

        map = new Map({
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
        map.touchZoomRotate.disableRotation();
        map.addControl(new AttributionControl({ compact: true }), "bottom-right");

        map.once("load", () => {
          if (cancelled || !map) return;
          didLoad = true;

          setStatus("ready");
          onReadyRef.current?.(map);
        });

        map.on("error", (event) => {
          // A tile, glyph or sprite may fail while the basemap remains usable.
          // Do not hide the whole map on recoverable resource errors.
          console.error("MapLibre resource error", event.error);
          if (!cancelled && !didLoad && event.error?.message?.includes("Failed to initialize WebGL")) {
            setStatus("error");
          }
        });
      } catch (error) {
        console.error("MapLibre initialization failed", error);
        if (!cancelled) setStatus("error");
      }
    }

    void createMap();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [attempt]);

  return (
    <div
      className={embedded ? styles.embedded : styles.shell}
      aria-label="Bản đồ kỷ niệm"
    >
      <div ref={containerRef} className={styles.map} />
      {status !== "ready" && (
        <div className={styles.status} role="status" aria-live="polite">
          {status === "loading" ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Đang mở bản đồ…
            </>
          ) : (
            <>
              Không thể tải bản đồ.
              <button type="button" onClick={retry}>Thử lại</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
