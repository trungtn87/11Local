"use client";

import { useEffect, useMemo, useState } from "react";
import { LngLatBounds, Marker, Popup, type Map as MapType } from "maplibre-gl";
import Link from "next/link";
import { MapCanvas } from "@/features/map/map-canvas";
import { MAP_CATEGORIES } from "@/lib/map-place";
import type { Place } from "@/lib/family";

type KindFilter = "all" | "memory" | "curated";
const iconFor = (category: string) => MAP_CATEGORIES.find(item => item.value === category)?.emoji || "📍";
const labelFor = (category: string) => MAP_CATEGORIES.find(item => item.value === category)?.label || "Địa điểm";
const validCoords = (place: Place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
  && Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180;

export function MemoryMap({ places }: { places: Place[] }) {
  const [map, setMap] = useState<MapType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [kind, setKind] = useState<KindFilter>("all");

  const pins = useMemo(() => places.filter(place => validCoords(place) &&
    (category === "all" || place.category === category) &&
    (kind === "all" || place.kind === kind)), [places, category, kind]);
  const selected = pins.find(place => place.id === selectedId) || null;

  useEffect(() => {
    if (!map) return;
    const markers = pins.map(place => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "memory-pin gau-map-pin " + (place.kind === "memory" ? "gau-map-memory-pin" : "gau-map-curated-pin");
      el.textContent = place.kind === "memory" ? "🍯" : iconFor(place.category);
      el.title = place.title;
      el.setAttribute("aria-label", "Xem địa điểm " + place.title);
      const marker = new Marker({ element: el, anchor: "bottom" }).setLngLat([place.longitude,place.latitude]).addTo(map);
      const handleClick = () => {
        setSelectedId(place.id);
        map.flyTo({ center: [place.longitude,place.latitude], zoom: Math.max(12,map.getZoom()), essential: true });
      };
      el.addEventListener("click",handleClick);
      return { marker, el, handleClick };
    });
    // A region with family pins opens them in view; otherwise retain the default Cao Bằng camera.
    if (pins.length === 1) {
      map.flyTo({ center: [pins[0].longitude,pins[0].latitude], zoom: 11, essential: false });
    } else if (pins.length > 1) {
      const bounds = new LngLatBounds();
      pins.forEach(place => bounds.extend([place.longitude,place.latitude]));
      map.fitBounds(bounds,{ padding: 56, maxZoom: 12, duration: 0 });
    }
    return () => markers.forEach(({ marker,el,handleClick }) => {
      el.removeEventListener("click",handleClick);
      marker.remove();
    });
  }, [map,pins]);

  // Explain the selected marker on the map without injecting user HTML.
  useEffect(() => {
    if (!map || !selected) return;
    const node = document.createElement("div");
    node.className = "gau-map-popup";
    const strong = document.createElement("strong");
    strong.textContent = selected.title;
    node.append(strong);
    const small = document.createElement("small");
    small.textContent = selected.kind === "memory" ? "🍯 Kỷ niệm gia đình" : labelFor(selected.category);
    node.append(small);
    const popup = new Popup({ offset: 24, closeButton: true, closeOnClick: false })
      .setLngLat([selected.longitude,selected.latitude])
      .setDOMContent(node).addTo(map);
    return () => { popup.remove(); };
  }, [map,selected]);

  function focus(place: Place) {
    setSelectedId(place.id);
    map?.flyTo({ center: [place.longitude,place.latitude], zoom: 13, essential: true });
  }

  const memoryCount = places.filter(place => place.kind === "memory").length;
  const curatedCount = places.length - memoryCount;
  return <div className="gau-memory-map-page">
    <div className="gau-map-legend" aria-label="Chú giải bản đồ">
      <span><span aria-hidden="true">🍯</span> Gia đình đã ghé</span>
      <span><span aria-hidden="true">📍</span> Địa điểm gia đình giới thiệu</span>
      <span>Địa điểm nền và tên khu vực từ OpenFreeMap</span>
    </div>
    <div className="map-layout">
      <div className="memory-map"><MapCanvas embedded onReady={setMap} /></div>
      <aside className="map-list gau-map-sidebar">
        <div className="gau-map-sidebar-heading"><h2>Địa điểm ({places.length})</h2>
          <p>{memoryCount} nơi đã ghé · {curatedCount} địa điểm giới thiệu</p>
        </div>
        <div className="gau-map-filter-row">
          <label>Loại địa điểm
            <select value={kind} onChange={event => {setKind(event.target.value as KindFilter);setSelectedId(null);}}>
              <option value="all">Tất cả điểm của gia đình</option>
              <option value="memory">Đã ghé thăm</option>
              <option value="curated">Địa điểm giới thiệu</option>
            </select>
          </label>
          <label>Danh mục
            <select value={category} onChange={event => {setCategory(event.target.value);setSelectedId(null);}}>
              <option value="all">Tất cả danh mục</option>
              {MAP_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.emoji} {item.label}</option>)}
            </select>
          </label>
        </div>
        {pins.length ? pins.map(place => <article key={place.id} className={"gau-map-place " + (selectedId === place.id ? "active" : "")}>
          <button type="button" className="gau-map-place-focus" onClick={() => focus(place)}>
            <span className="gau-map-place-icon" aria-hidden="true">{place.kind === "memory" ? "🍯" : iconFor(place.category)}</span>
            <span className="gau-map-place-content"><strong>{place.title}</strong>
              <small>{place.kind === "memory" ? "Kỷ niệm đã ghé thăm" : labelFor(place.category)}
                {place.visited_on ? " · " + place.visited_on : ""}</small>
              {place.address && <small>{place.address}</small>}
            </span>
          </button>
          {place.description && <p>{place.description}</p>}
          {place.album_ids?.length ? <div className="gau-map-album-links">
            {place.album_ids.slice(0,4).map((id,index) =>
              <Link key={id} href={"/album/" + id}>{index === 0 ? "Xem album" : "Album " + (index + 1)} →</Link>)}
            {place.album_ids.length > 4 && <span>+{place.album_ids.length - 4} album nữa</span>}
          </div> : place.album_id && <Link className="gau-map-first-album" href={"/album/" + place.album_id}>Xem album →</Link>}
        </article>) : <div className="gau-map-empty">
          Chưa có địa điểm nào trong bộ lọc này. Các địa điểm nền OpenFreeMap vẫn có trên bản đồ.
        </div>}
        <Link className="gau-map-add" href="/dong-gop">+ Góp thêm địa điểm kỷ niệm</Link>
      </aside>
    </div>
  </div>;
}
