export default function AlbumLoading() {
  return <main className="wrap" aria-busy="true" aria-label="Đang mở album">
    <div className="page-title"><h1>Album của Gấu</h1></div>
    <div className="album-grid">
      <div className="skeleton-album" /><div className="skeleton-album" />
      <div className="skeleton-album" />
    </div>
  </main>;
}
