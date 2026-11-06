"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./place-video-manager.module.css";

type AdminVideo = { id: string; provider: string; source_url: string;
  title: string; creator_name: string; is_featured: boolean; visibility: "visible" | "hidden" };
type VideoDraft = { title: string; creatorName: string; isFeatured: boolean; visibility: "visible" | "hidden" };
const errors: Record<string, string> = {
  VIDEO_EXISTS: "Video này đã được gắn với địa điểm.",
  INVALID_VIDEO_URL: "Link phải dùng HTTPS và thuộc TikTok, Facebook hoặc YouTube.",
  UNSUPPORTED_VIDEO_LINK: "Link chưa được hỗ trợ. Hãy dùng link đến video/bài viết cụ thể.",
};

export function PlaceVideoManager({ placeId }: { placeId: string }) {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const res = await fetch("/api/admin/places/" + placeId + "/videos", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được danh sách video. Kiểm tra migration Neon.");
    const body = await res.json();
    setVideos(body.videos || []);
  }, [placeId]);
  useEffect(() => {
    let live = true;
    void fetch("/api/admin/places/" + placeId + "/videos", { cache: "no-store" })
      .then(res => { if (!res.ok) throw new Error("Không tải được danh sách video. Kiểm tra migration Neon."); return res.json(); })
      .then(body => { if (live) setVideos(body.videos || []); })
      .catch(e => { if (live) setMessage(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [placeId]);

  async function addVideo() {
    if (!url.trim() || busy) return;
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/places/" + placeId + "/videos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title, creatorName }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(errors[body.error] || body.error || "Không thêm được video.");
      }
      setUrl(""); setTitle(""); setCreatorName("");
      await load(); setMessage("Đã gắn video với địa điểm này.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Không thể kết nối."); }
    finally { setBusy(false); }
  }
  async function updateVideo(video: AdminVideo, change: Partial<VideoDraft>) {
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/videos/" + video.id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: video.title, creatorName: video.creator_name,
          visibility: video.visibility, isFeatured: video.is_featured,
          ...change,
        }),
      });
      if (!res.ok) throw new Error("Không cập nhật được video.");
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Không thể kết nối."); }
    finally { setBusy(false); }
  }
  async function removeVideo(video: AdminVideo) {
    if (!confirm("Xóa liên kết video này khỏi địa điểm?") || busy) return;
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/videos/" + video.id, { method: "DELETE" });
      if (!res.ok) throw new Error("Không xóa được video.");
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Không thể kết nối."); }
    finally { setBusy(false); }
  }

  return <section className={styles.section} aria-label="Video review liên kết với địa điểm">
    <h3>Video review địa điểm</h3>
    <p>Thêm nhiều video TikTok, Facebook, YouTube cho địa điểm đang chọn. Link video độc lập với tài khoản mạng xã hội của quán.</p>
    <div className={styles.fields}>
      <label className={styles.full}>Link video *
        <input type="url" value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@.../video/... hoặc link Facebook/YouTube"
          maxLength={1024}/>
      </label>
      <label>Tiêu đề (tùy chọn)
        <input value={title} maxLength={180} onChange={e => setTitle(e.target.value)} />
      </label>
      <label>Người review (tùy chọn)
        <input value={creatorName} maxLength={120} onChange={e => setCreatorName(e.target.value)}/>
      </label>
    </div>
    <button className={styles.primary} type="button" disabled={busy || !url.trim()} onClick={() => void addVideo()}>
      {busy ? "Đang xử lý…" : "+ Gắn video vào địa điểm"}
    </button>
    {message && <p className={styles.message} role="status">{message}</p>}
    {loading ? <p>Đang tải video…</p> : videos.length === 0 ? <p>Địa điểm chưa có video review.</p> : (
      <div className={styles.list}>
        {videos.map(video => <div key={video.id} className={styles.item}>
          <div className={styles.itemHeading}>
            <strong>{video.title || "Video " + video.provider}</strong>
            <span>{video.provider}</span>
          </div>
          <a href={video.source_url} target="_blank" rel="noopener noreferrer">Mở video gốc</a>
          <div className={styles.actions}>
            <button type="button" disabled={busy} onClick={() => void updateVideo(video, { visibility: video.visibility === "visible" ? "hidden" : "visible" })}>
              {video.visibility === "visible" ? "Ẩn" : "Hiện"}
            </button>
            <button type="button" disabled={busy} onClick={() => void updateVideo(video, { isFeatured: !video.is_featured })}>
              {video.is_featured ? "Bỏ nổi bật" : "Nổi bật"}
            </button>
            <button type="button" disabled={busy} onClick={() => void removeVideo(video)}>Xóa</button>
          </div>
        </div>)}
      </div>
    )}
  </section>;
}
