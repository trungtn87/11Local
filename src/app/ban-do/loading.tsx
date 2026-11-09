export default function MapLoading() {
  return <main className="wrap" aria-busy="true" aria-label="Đang mở bản đồ">
    <div className="page-title"><h1>Gấu đã đi đâu?</h1></div>
    <div className="skeleton-hero" role="status" aria-label="Đang tải bản đồ" />
  </main>;
}
