export default function Loading() {
  return (
    <main className="wrap" aria-busy="true" aria-label="Đang tải kỷ niệm của Gấu">
      <div className="skeleton-hero" />
      <div className="feature-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
      <div className="album-grid">
        <div className="skeleton-album" />
        <div className="skeleton-album" />
        <div className="skeleton-album" />
      </div>
    </main>
  );
}
