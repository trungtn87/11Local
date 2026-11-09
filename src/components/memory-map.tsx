"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { LngLatBounds, Marker, type Map as MapType } from "maplibre-gl";
import Link from "next/link";
import { MapCanvas } from "@/features/map/map-canvas";
import type { Place } from "@/lib/family";

const validCoords = (place: Place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
  && Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180;

export function MemoryMap({ places }: { places: Place[] }) {
  const [map, setMap] = useState<MapType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Default closed on small screens, open on desktop. Preserve deliberate user choices.
  const [desktop, setDesktop] = useState(false);
  const [listOverride, setListOverride] = useState<boolean | null>(null);
  const listExpanded = listOverride ?? desktop;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 781px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  // Only family memories belong on this map; curated legacy records stay untouched in storage.
  const pins = useMemo(() => places.filter(place => place.kind === "memory" && validCoords(place)), [places]);
  const selected = pins.find(place => place.id === selectedId) || null;

  useEffect(() => {
    if (!map) return;
    const markers = pins.map(place => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "memory-pin gau-map-pin gau-map-memory-pin";
      el.textContent = "🍯";
      el.title = place.title;
      el.setAttribute("aria-label", "Xem ảnh tại " + place.title);
      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([place.longitude, place.latitude]).addTo(map);
      const handleClick = () => {
        setSelectedId(place.id);
        map.flyTo({ center: [place.longitude, place.latitude], zoom: Math.max(12, map.getZoom()), essential: true });
      };
      el.addEventListener("click", handleClick);
      return { marker, el, handleClick };
    });
    if (pins.length === 1) {
      map.flyTo({ center: [pins[0].longitude, pins[0].latitude], zoom: 11, essential: false });
    } else if (pins.length > 1) {
      const bounds = new LngLatBounds();
      pins.forEach(place => bounds.extend([place.longitude, place.latitude]));
      map.fitBounds(bounds, { padding: 56, maxZoom: 12, duration: 0 });
    }
    return () => markers.forEach(({ marker, el, handleClick }) => {
      el.removeEventListener("click", handleClick);
      marker.remove();
    });
  }, [map, pins]);

  useEffect(() => {
    if (!selectedId || !window.matchMedia("(max-width: 780px)").matches) return;
    document.getElementById("gau-map-selected")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  function focus(place: Place) {
    setSelectedId(place.id);
    map?.flyTo({ center: [place.longitude, place.latitude], zoom: 13, essential: true });
  }

  return <div className="gau-memory-map-page">
    <div className="map-layout">
      <div className="memory-map"><MapCanvas embedded onReady={setMap} /></div>
      <aside className="map-list gau-map-sidebar" aria-label="Địa điểm và ảnh gia đình">
        <div className="gau-map-sidebar-heading">
          <h2>Địa điểm ({pins.length})</h2>
          <button type="button" className="gau-map-list-toggle"
            aria-expanded={listExpanded}
            aria-controls="gau-map-list-content"
            onClick={() => setListOverride(!listExpanded)}>
            {listExpanded ? "Thu gọn" : "Hiện danh sách"}
            {listExpanded ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
          </button>
        </div>
        {selected && <section id="gau-map-selected" className="gau-map-selected" aria-live="polite">
          <div className="gau-map-selected-heading">
            <div><h3>{selected.title}</h3>
              <p>{selected.photo_count} ảnh{selected.visited_on ? " · " + selected.visited_on : ""}</p></div>
            <button type="button" aria-label="Đóng ảnh địa điểm" onClick={() => setSelectedId(null)}>×</button>
          </div>
          {selected.photo_ids.length ? <div className="gau-map-photo-grid">
            {selected.photo_ids.map(id => <Link href={`/anh/${id}?view=place&group=${selected.id}`} key={id}
              aria-label={`Xem ảnh tại ${selected.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${id}`} loading="lazy" alt={`Ảnh kỷ niệm tại ${selected.title}`} />
            </Link>)}
          </div> : <p className="gau-map-no-photos">Chưa có ảnh gắn trực tiếp với địa điểm này.</p>}
          {selected.photo_count > 0 && <Link className="gau-map-gallery-link"
            href={`/ky-niem/dia-diem/${selected.id}`}>Xem tất cả {selected.photo_count} ảnh →</Link>}
          {!!selected.album_ids?.length && <div className="gau-map-album-links">
            {selected.album_ids.slice(0, 3).map((id, index) =>
              <Link key={id} href={`/album/${id}`}>Album liên quan {index + 1} →</Link>)}
          </div>}
        </section>}
        <div id="gau-map-list-content" className="gau-map-list-content" hidden={!listExpanded}>
          <div className="gau-map-place-list">
          {pins.length ? pins.map(place => <article key={place.id}
            className={"gau-map-place " + (selectedId === place.id ? "active" : "")}>
            <button type="button" className="gau-map-place-focus"
              aria-pressed={selectedId === place.id} onClick={() => focus(place)}>
              <span className="gau-map-place-icon" aria-hidden="true">🍯</span>
              <span className="gau-map-place-content">
                <strong>{place.title}</strong>
                <small>{place.photo_count} ảnh{place.visited_on ? " · " + place.visited_on : ""}</small>
                {place.address && <small>{place.address}</small>}
              </span>
            </button>
          </article>) : <div className="gau-map-empty">
            Gia đình chưa ghim địa điểm nào. Khi thêm địa điểm kỷ niệm, ghim sẽ xuất hiện trên bản đồ.
          </div>}
        </div>
          <Link className="gau-map-add" href="/dong-gop">+ Góp thêm địa điểm kỷ niệm</Link>
        </div>
      </aside>
    </div>
  </div>;
}
