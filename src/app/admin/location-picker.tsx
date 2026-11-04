"use client";

import { MapPin } from "lucide-react";
import { PinMap } from "./pin-map";
import styles from "./location-picker.module.css";

type Props = {
  latitude: number;
  longitude: number;
  onChange: (longitude: number, latitude: number) => void;
};

export function LocationPicker({ latitude, longitude, onChange }: Props) {
  return (
    <section className={styles.root} aria-label="Chọn vị trí địa điểm">
      <div className={styles.heading}>
        <b><MapPin size={17} /> Ghim địa điểm</b>
        <span aria-label="Tọa độ đã chọn">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
      </div>
      <p className={styles.hint}>
        Kéo bản đồ để đưa ghim ở chính giữa tới đúng vị trí địa điểm. Tọa độ chỉ hiển thị để tham khảo, không nhập tay.
      </p>
      <PinMap latitude={latitude} longitude={longitude} onChange={onChange} />
      <p className={styles.attribution}>
        Nền bản đồ: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          © OpenStreetMap contributors
        </a>. Chỉ địa điểm được duyệt mới xuất hiện trên bản đồ công khai.
      </p>
    </section>
  );
}
