"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff, Images } from "lucide-react";

export function PlaceGallery({ name, photos }: {
  name: string;
  photos: Array<{ id: string; alt: string | null; caption: string | null }>;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const photo = photos[index];
  const visible = photo && !failed.includes(photo.id);
  return <div className="local-detail-gallery">
    {visible ? <Image
      key={photo.id}
      src={`/api/place-photos/${encodeURIComponent(photo.id)}?size=detail`}
      alt={photo.alt || `${name} — ảnh ${index + 1}`}
      fill
      loading={index === 0 ? "eager" : "lazy"}
      fetchPriority={index === 0 ? "high" : "auto"}
      unoptimized
      sizes="(max-width: 800px) 100vw, 420px"
      style={{ objectFit: "cover" }}
      onError={() => setFailed((previous) => previous.includes(photo.id) ? previous : [...previous, photo.id])}
    /> : <div className="local-detail-empty-photo"><ImageOff size={30} />Chưa có ảnh được duyệt</div>}
    {photos.length > 1 && <>
      <button type="button" className="local-detail-photo-prev" aria-label="Ảnh trước"
        onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}>
        <ChevronLeft size={20} />
      </button>
      <button type="button" className="local-detail-photo-next" aria-label="Ảnh tiếp theo"
        onClick={() => setIndex((i) => (i + 1) % photos.length)}>
        <ChevronRight size={20} />
      </button>
      <span className="local-detail-photo-count"><Images size={14}/>{index + 1}/{photos.length} ảnh</span>
    </>}
  </div>;
}
