"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Camera, ChevronLeft, ChevronRight, ImageOff, Images, LogIn, Maximize2,
} from "lucide-react";
import { Lightbox, PhotoCard } from "@/features/demo-ui/legacy/components/ui.jsx";

type PhotoItem = {
  id: string;
  alt: string | null;
  caption: string | null;
  type?: string;
  created_at?: string | null;
};

export function PlaceGallery({
  name,
  photos,
  showGrid = true,
}: {
  name: string;
  photos: PhotoItem[];
  showGrid?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const safeIndex = photos.length > 0 ? ((index % photos.length) + photos.length) % photos.length : 0;
  const photo = photos[safeIndex];
  const visible = photo && !failed.includes(photo.id);

  const openAt = (targetIndex: number) => {
    setIndex(targetIndex);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="local-detail-gallery">
        {visible ? (
          <button
            type="button"
            className="local-detail-cover-btn"
            onClick={() => openAt(safeIndex)}
            aria-label={`Mở phóng to ảnh ${safeIndex + 1} của ${name}`}
          >
            <Image
              key={photo.id}
              src={`/api/place-photos/${encodeURIComponent(photo.id)}?size=detail`}
              alt={photo.alt || `${name} — ảnh ${safeIndex + 1}`}
              fill
              loading={safeIndex === 0 ? "eager" : "lazy"}
              fetchPriority={safeIndex === 0 ? "high" : "auto"}
              unoptimized
              sizes="(max-width: 800px) 100vw, 480px"
              style={{ objectFit: "cover" }}
              onError={() =>
                setFailed((previous) =>
                  previous.includes(photo.id) ? previous : [...previous, photo.id],
                )
              }
            />
            <span className="local-detail-zoom-badge">
              <Maximize2 size={13} /> Phóng to
            </span>
          </button>
        ) : (
          <div className="local-detail-empty-photo">
            <ImageOff size={30} />
            <span>Chưa có ảnh kỷ niệm được duyệt</span>
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="local-detail-photo-prev"
              aria-label="Ảnh trước"
              onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="local-detail-photo-next"
              aria-label="Ảnh tiếp theo"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
        {photos.length > 0 && (
          <button
            type="button"
            className="local-detail-photo-count"
            onClick={() => openAt(safeIndex)}
          >
            <Images size={14} /> {safeIndex + 1}/{photos.length} ảnh
          </button>
        )}
      </div>

      {showGrid && photos.length > 0 && (
        <section className="gau-album-gallery-section" aria-label={`Danh sách ảnh trong album ${name}`}>
          <div className="gau-album-gallery-head">
            <h3>
              <Images size={16} /> Bộ sưu tập ảnh ({photos.length})
            </h3>
            <small>Chạm vào ảnh để mở xem toàn màn hình (trước / sau)</small>
          </div>
          <div className="gau-photo-grid">
            {photos.map((item, idx) => (
              <PhotoCard
                key={item.id}
                photo={item}
                index={idx}
                albumName={name}
                onOpen={openAt}
              />
            ))}
          </div>
        </section>
      )}

      <Lightbox
        open={lightboxOpen}
        photos={photos}
        index={safeIndex}
        albumName={name}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setIndex}
      />
    </>
  );
}

export function AlbumContributeCallout({ slug, name }: { slug: string; name: string }) {
  const [auth, setAuth] = useState<{ status: "loading" | "ready"; user: { name?: string; email?: string } | null }>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((body) => setAuth({ status: "ready", user: body?.user ?? null }))
      .catch((err) => {
        if (err.name !== "AbortError") setAuth({ status: "ready", user: null });
      });
    return () => controller.abort();
  }, []);

  const contributeHref = `/bao-sai/${encodeURIComponent(slug)}?loai=photo`;
  const returnTo = `/dia-diem/${encodeURIComponent(slug)}`;

  return (
    <section className="gau-contribute-callout" aria-label="Đóng góp ảnh cho album">
      {auth.user ? (
        <div className="gau-contribute-callout-box logged-in">
          <div>
            <strong>Góp thêm ảnh vào album “{name}”</strong>
            <p>
              Bạn đang đăng nhập Google ({auth.user.name || auth.user.email}). Ảnh gửi lên sẽ được Admin duyệt trước khi hiển thị công khai.
            </p>
          </div>
          <Link href={contributeHref} className="btn btn-primary btn-sm">
            <Camera size={16} /> Đóng góp ảnh
          </Link>
        </div>
      ) : (
        <div className="gau-contribute-callout-box guest">
          <div>
            <strong>Bạn có ảnh kỷ niệm tại “{name}”?</strong>
            <p>
              Hãy đăng nhập bằng tài khoản Google để gửi ảnh đóng góp vào cuốn album gia đình của Gấu nhé!
            </p>
          </div>
          <div className="row-wrap">
            <a
              href={`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`}
              className="btn btn-accent btn-sm"
            >
              <LogIn size={16} /> Đăng nhập Google để góp ảnh
            </a>
            <Link href={contributeHref} className="btn btn-outline btn-sm">
              <Camera size={16} /> Gửi ảnh nhanh
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
