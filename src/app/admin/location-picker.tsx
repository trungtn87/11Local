"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { parseCoordinateInput } from "@/lib/coordinate-input";
import { PinMap } from "./pin-map";
import styles from "./location-picker.module.css";

type Props = {
  latitude: number;
  longitude: number;
  onChange: (longitude: number, latitude: number) => void;
};

export function LocationPicker({ latitude, longitude, onChange }: Props) {
  // Keep unsaved edits in the fields, but refresh them when a different place
  // is selected or the pin is moved on the map.
  const [draft, setDraft] = useState(() => ({
    baseLatitude: latitude,
    baseLongitude: longitude,
    lat: latitude.toFixed(6),
    lng: longitude.toFixed(6),
  }));
  const synchronized = draft.baseLatitude === latitude && draft.baseLongitude === longitude;
  const latText = synchronized ? draft.lat : latitude.toFixed(6);
  const lngText = synchronized ? draft.lng : longitude.toFixed(6);
  const [feedback, setFeedback] = useState("");

  const applyCoordinates = () => {
    const lat = parseCoordinateInput(latText, -90, 90);
    const lng = parseCoordinateInput(lngText, -180, 180);
    if (lat === null || lng === null) {
      setFeedback("Tọa độ không hợp lệ. Vĩ độ: -90 đến 90; kinh độ: -180 đến 180.");
      return;
    }
    setFeedback("");
    setDraft({
      baseLatitude: lat,
      baseLongitude: lng,
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
    });
    onChange(lng, lat);
  };

  return (
    <section className={styles.root} aria-label="Chọn vị trí địa điểm">
      <div className={styles.heading}>
        <b><MapPin size={17} /> Vị trí địa điểm</b>
        <span>{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
      </div>

      <div className={styles.coordinates}>
        <label>
          Vĩ độ (latitude)
          <input
            type="text"
            inputMode="decimal"
            aria-label="Vĩ độ"
            value={latText}
            onChange={(event) => setDraft({
              baseLatitude: latitude,
              baseLongitude: longitude,
              lat: event.target.value,
              lng: lngText,
            })}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); applyCoordinates(); }
            }}
          />
        </label>
        <label>
          Kinh độ (longitude)
          <input
            type="text"
            inputMode="decimal"
            aria-label="Kinh độ"
            value={lngText}
            onChange={(event) => setDraft({
              baseLatitude: latitude,
              baseLongitude: longitude,
              lat: latText,
              lng: event.target.value,
            })}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); applyCoordinates(); }
            }}
          />
        </label>
        <button type="button" className={styles.apply} onClick={applyCoordinates}>
          Áp dụng tọa độ
        </button>
      </div>

      {feedback && <p className={styles.feedback} role="status">{feedback}</p>}
      <p className={styles.hint}>
        Nhập vĩ độ và kinh độ rồi nhấn Áp dụng, hoặc bấm/kéo ghim trên bản đồ.
      </p>
      <PinMap latitude={latitude} longitude={longitude} onChange={onChange} />
      <p className={styles.attribution}>
        Nền bản đồ: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          © OpenStreetMap contributors
        </a>. Chỉ địa điểm được duyệt trên 11Local mới hiện trên bản đồ công khai.
      </p>
    </section>
  );
}
