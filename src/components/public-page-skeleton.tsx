type Variant = "home" | "search" | "detail";

function Ghost({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={"local-skeleton-pulse " + className} />;
}

export function PublicPageSkeleton({ variant = "home" }: { variant?: Variant }) {
  return <main className="local-loading-root" role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">Đang tải Nhà của Gấu, vui lòng đợi…</span>
    <header className="local-loading-header">
      <strong>Nhà của <em>Gấu</em></strong>
      <Ghost className="local-loading-search"/>
      <Ghost className="local-loading-menu"/>
    </header>
    <div className="container local-loading-body">
      {variant === "detail" ? <>
        <Ghost className="local-loading-title"/>
        <div className="local-loading-detail-layout">
          <Ghost className="local-loading-map"/>
          <div className="local-loading-detail-panel">
            <Ghost className="local-loading-cover"/>
            <Ghost className="local-loading-title"/>
            <Ghost className="local-loading-line"/>
            <Ghost className="local-loading-line short"/>
            <Ghost className="local-loading-action"/>
          </div>
        </div>
      </> : <>
        {variant === "home" && <>
          <Ghost className="local-loading-title"/>
          <div className="local-loading-categories">
            {[0, 1, 2, 3].map(i => <Ghost key={i} className="local-loading-category"/>)}
          </div>
        </>}
        <Ghost className="local-loading-title"/>
        <Ghost className="local-loading-line"/>
        <div className="local-loading-cards">
          {[0, 1, 2, 3].map(i => <div className="local-loading-card" key={i}>
            <Ghost className="local-loading-card-image"/>
            <div className="local-loading-card-content">
              <Ghost className="local-loading-line"/>
              <Ghost className="local-loading-line short"/>
            </div>
          </div>)}
        </div>
      </>}
    </div>
  </main>;
}
