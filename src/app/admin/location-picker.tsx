"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { PinMap } from "./pin-map";
import styles from "./location-picker.module.css";

type Props = {
  latitude: number;
  longitude: number;
  onChange: (longitude: number, latitude: number) => void;
  onPendingChange?: (pending: boolean) => void;
};

function parseCoordinate(raw: string, min: number, max: number): number | null {
  const text = raw.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

export function LocationPicker({ latitude, longitude, onChange, onPendingChange }: Props) {
  const [latitudeText, setLatitudeText] = useState(String(latitude));
  const [longitudeText, setLongitudeText] = useState(String(longitude));
  const [error, setError] = useState("");

  const applyCoordinates = () => {
    const nextLatitude = parseCoordinate(latitudeText, -90, 90);
    const nextLongitude = parseCoordinate(longitudeText, -180, 180);
    if (nextLatitude === null || nextLongitude === null) {
      setError("Tọa độ không hợp lệ. Vĩ độ từ -90 đến 90, kinh độ từ -180 đến 180. Dùng dấu chấm cho phần thập phân.");
      return;
    }
    setError("");
    setLatitudeText(String(nextLatitude));
    setLongitudeText(String(nextLongitude));
    onChange(nextLongitude, nextLatitude);
    onPendingChange?.(false);
  };

  return (
    <section className={styles.root} aria-label="Chọn vị trí địa điểm">
      <div className={styles.heading}>
        <b><MapPin size={17} /> Ghim địa điểm</b>
        <span aria-label="Tọa độ đã chọn">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
      </div>
      <p className={styles.hint}>
        Kéo bản đồ để chọn vị trí hoặc nhập tọa độ thủ công bên dưới (chỉ dành cho Admin).
      </p>
      <div className={styles.coordinates}>
        <label>
          Vĩ độ (Latitude)
          <input type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
            value={latitudeText} onChange={event => {
              setLatitudeText(event.target.value);
              setError("");
              onPendingChange?.(true);
            }} aria-label="Vĩ độ" placeholder="22.666713" />
        </label>
        <label>
          Kinh độ (Longitude)
          <input type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
            value={longitudeText} onChange={event => {
              setLongitudeText(event.target.value);
              setError("");
              onPendingChange?.(true);
            }} aria-label="Kinh độ" placeholder="106.258665" />
        </label>
      </div>
      <div className={styles.applyRow}>
        <button type="button" className={styles.applyButton} onClick={applyCoordinates}>
          Đặt ghim theo tọa độ
        </button>
        <span>Nhập xong, bấm đặt ghim rồi lưu địa điểm.</span>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <PinMap latitude={latitude} longitude={longitude} onChange={(nextLongitude, nextLatitude) => {
        setLatitudeText(String(nextLatitude));
        setLongitudeText(String(nextLongitude));
        onChange(nextLongitude, nextLatitude);
        onPendingChange?.(false);
        setError("");
      }} />
      <p className={styles.attribution}>
        Nền bản đồ: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          © OpenStreetMap contributors
        </a>. Chỉ địa điểm được duyệt mới xuất hiện trên bản đồ công khai.
      </p>
    </section>
  );
}
