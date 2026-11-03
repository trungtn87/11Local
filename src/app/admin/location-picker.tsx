"use client";

import { useEffect, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { parseCoordinateInput } from "@/lib/coordinate-input";
import { PinMap } from "./pin-map";
import styles from "./location-picker.module.css";

type SearchResult = { id: string; name: string; latitude: number; longitude: number };
type SearchResponse = { results?: SearchResult[]; error?: string };

type Props = {
  latitude: number;
  longitude: number;
  onChange: (longitude: number, latitude: number) => void;
};

export function LocationPicker({ latitude, longitude, onChange }: Props) {
  const [latText, setLatText] = useState(latitude.toFixed(6));
  const [lngText, setLngText] = useState(longitude.toFixed(6));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setLatText(latitude.toFixed(6));
    setLngText(longitude.toFixed(6));
  }, [latitude, longitude]);

  const applyCoordinates = () => {
    const lat = parseCoordinateInput(latText, -90, 90);
    const lng = parseCoordinateInput(lngText, -180, 180);
    if (lat === null || lng === null) {
      setFeedback("Tọa độ không hợp lệ. Vĩ độ: -90 đến 90; kinh độ: -180 đến 180.");
      return;
    }
    setFeedback("");
    setResults([]);
    setLatText(lat.toFixed(6));
    setLngText(lng.toFixed(6));
    onChange(lng, lat);
  };

  const search = async () => {
    const text = query.trim();
    if (text.length < 2) {
      setFeedback("Nhập tối thiểu 2 ký tự để tìm địa điểm.");
      return;
    }
    setSearching(true);
    setFeedback("");
    setResults([]);
    try {
      const response = await fetch(`/api/admin/geocode?q=${encodeURIComponent(text)}`, {
        cache: "no-store",
      });
      const body = await response.json() as SearchResponse;
      if (!response.ok) {
        throw new Error(body.error === "RATE_LIMITED"
          ? "Tìm kiếm quá nhanh. Hãy thử lại sau vài giây."
          : body.error === "UNAUTHORIZED"
            ? "Phiên quản trị đã hết hạn. Hãy đăng nhập lại."
            : "Không thể tìm kiếm lúc này. Bạn vẫn có thể nhập tọa độ hoặc chọn trên bản đồ.");
      }
      const items = body.results ?? [];
      setResults(items);
      if (!items.length) setFeedback("Không có kết quả. Thử thêm “Cao Bằng” vào từ khóa hoặc nhập tọa độ.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Không thể tìm kiếm địa điểm.");
    } finally {
      setSearching(false);
    }
  };

  const choose = (result: SearchResult) => {
    onChange(result.longitude, result.latitude);
    setQuery(result.name);
    setResults([]);
    setFeedback("Đã đặt ghim theo kết quả tìm kiếm. Hãy kiểm tra vị trí trên bản đồ.");
  };

  return (
    <section className={styles.root} aria-label="Chọn vị trí địa điểm">
      <div className={styles.heading}>
        <b><MapPin size={17} /> Vị trí địa điểm</b>
        <span>{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
      </div>

      <div className={styles.searchRow}>
        <input
          type="search"
          aria-label="Tìm tên hoặc địa chỉ địa điểm"
          placeholder="Tìm Pác Bó, suối Lê Nin, tên đường, địa chỉ…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (!searching) void search();
            }
          }}
        />
        <button type="button" onClick={() => void search()} disabled={searching}>
          <Search size={16} /> {searching ? "Đang tìm…" : "Tìm kiếm"}
        </button>
      </div>

      {results.length > 0 && (
        <div className={styles.results} role="list" aria-label="Kết quả tìm kiếm">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              role="listitem"
              onClick={() => choose(result)}
            >
              <MapPin size={15} />
              <span>{result.name}<small>{result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}</small></span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.coordinates}>
        <label>
          Vĩ độ (latitude)
          <input
            type="text"
            inputMode="decimal"
            aria-label="Vĩ độ"
            value={latText}
            onChange={(event) => setLatText(event.target.value)}
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
            onChange={(event) => setLngText(event.target.value)}
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
        Tìm kiếm và chọn kết quả, nhập tọa độ rồi nhấn Áp dụng, hoặc bấm/kéo ghim trực tiếp trên bản đồ.
      </p>
      <PinMap latitude={latitude} longitude={longitude} onChange={onChange} />
      <p className={styles.attribution}>
        Dữ liệu tìm kiếm: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          © OpenStreetMap contributors
        </a>. Kết quả có thể chưa chính xác; kiểm tra ghim trước khi lưu.
      </p>
    </section>
  );
}
