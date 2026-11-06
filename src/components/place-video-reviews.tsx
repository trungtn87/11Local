"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import styles from "./place-video-reviews.module.css";

export type PlaceReviewVideo = {
  id: string; provider: "facebook" | "tiktok" | "youtube";
  title: string; creator_name: string; source_url: string; embed_url: string | null;
};

const labels = { facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };
export function PlaceVideoReviews({ videos }: { videos: PlaceReviewVideo[] }) {
  const [active, setActive] = useState<PlaceReviewVideo | null>(null);
  useEffect(() => {
    if (!active) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [active]);
  if (!videos.length) return null;
  return <section className={styles.section} aria-label="Video review địa điểm">
    <div className={styles.heading}>
      <h3>Video review thực tế</h3><span>{videos.length} video</span>
    </div>
    <p className={styles.description}>Góc nhìn của người trải nghiệm từ mạng xã hội.</p>
    <div className={styles.scroller}>
      {videos.map((video) => <div className={styles.card} key={video.id}>
        <button type="button" className={styles.thumbnail} disabled={!video.embed_url}
          onClick={() => video.embed_url && setActive(video)}
          aria-label={"Xem " + (video.title || "video") + " từ " + labels[video.provider]}>
          <span className={styles.platform}>{labels[video.provider]}</span>
          <Play size={32} aria-hidden="true" fill="currentColor" />
          <span className={styles.actionText}>{video.embed_url ? "Xem video" : "Chỉ xem tại nguồn"}</span>
        </button>
        <strong className={styles.title}>{video.title || "Review địa điểm"}</strong>
        {video.creator_name && <span className={styles.creator}>Bởi {video.creator_name}</span>}
        <a className={styles.source} href={video.source_url} target="_blank" rel="noopener noreferrer">
          Xem bài gốc <ExternalLink size={13} aria-hidden="true"/>
        </a>
      </div>)}
    </div>
    {active && active.embed_url && <div className={styles.overlay} role="dialog" aria-modal="true"
      aria-label={"Video review " + (active.title || labels[active.provider])}>
      <button className={styles.backdrop} type="button" onClick={() => setActive(null)} aria-label="Đóng video"/>
      <div className={styles.modal}>
        <div className={styles.modalTop}>
          <strong>{active.title || "Video review"}</strong>
          <button type="button" onClick={() => setActive(null)} aria-label="Đóng trình phát"><X size={23}/></button>
        </div>
        <iframe key={active.id} className={active.provider === "youtube" ? styles.landscape : styles.portrait}
          src={active.embed_url} title={active.title || "Video review"} loading="lazy"
          allow="fullscreen; encrypted-media; picture-in-picture; web-share"
          allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
        <a href={active.source_url} target="_blank" rel="noopener noreferrer">
          Không phát được? Xem trên {labels[active.provider]} <ExternalLink size={14} />
        </a>
      </div>
    </div>}
  </section>;
}
