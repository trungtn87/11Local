"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { GauLogoMark } from "@/components/gau-mascot";

const DESKTOP_NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/album", label: "Album" },
  { href: "/ban-do", label: "Bản đồ" },
  { href: "/dong-thoi-gian", label: "Dòng thời gian" },
  { href: "/dong-gop", label: "Cùng góp kỷ niệm" },
] as const;

export function SiteNav() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    if (q) {
      router.push(`/album?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/album");
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand" href="/" aria-label="Gia đình Gấu — Trang chủ">
            <GauLogoMark size={48} className="brand-logo" />
            <span className="brand-copy">
              <span className="brand-title">
                Gia đình <em>Gấu</em>
              </span>
              <small>Album • Chuyến đi • Kỷ niệm</small>
            </span>
          </Link>

          <nav className="site-links" aria-label="Điều hướng chính">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.href === "/" || item.href === "/album" || item.href === "/dong-thoi-gian" ? true : undefined}
                className={isActive(item.href) ? "site-link active" : "site-link"}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className={searchOpen ? "icon-btn active" : "icon-btn"}
              aria-label="Tìm kiếm album và kỷ niệm"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((prev) => !prev)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>

            <Link
              href="/tai-khoan"
              className="icon-btn mobile-only"
              aria-label="Tài khoản gia đình"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </svg>
            </Link>

            <Link className="account-link desktop-only" href="/tai-khoan">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </svg>
              <span>Tài khoản</span>
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="search-drawer">
            <form className="search-pill-form" onSubmit={handleSearchSubmit}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="search-pill-icon">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm album, chuyến đi, kỷ niệm của Gấu..."
                aria-label="Tìm album, chuyến đi, kỷ niệm của Gấu"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                  aria-label="Xóa từ khóa"
                >
                  ✕
                </button>
              )}
              <button type="submit" className="search-submit-pill">
                Tìm
              </button>
            </form>
          </div>
        )}
      </header>

      <nav className="mobile-nav" aria-label="Điều hướng di động">
        <Link
          href="/"
          prefetch={true}
          className={isActive("/") ? "mobile-nav-item active" : "mobile-nav-item"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.5" />
          </svg>
          <span>Trang chủ</span>
        </Link>

        <Link
          href="/album"
          prefetch={true}
          className={isActive("/album") ? "mobile-nav-item active" : "mobile-nav-item"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="m21 15-4.5-4.5L7 20" />
          </svg>
          <span>Album</span>
        </Link>

        <Link
          href="/ban-do"
          className={isActive("/ban-do") ? "mobile-nav-item active" : "mobile-nav-item"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
          <span>Bản đồ</span>
        </Link>

        <Link
          href="/dong-thoi-gian"
          prefetch={true}
          className={isActive("/dong-thoi-gian") ? "mobile-nav-item active" : "mobile-nav-item"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15.5 14" />
          </svg>
          <span>Thời gian</span>
        </Link>

        <Link
          href="/tai-khoan"
          className={
            isActive("/tai-khoan") || isActive("/dang-nhap") || isActive("/dong-gop")
              ? "mobile-nav-item active"
              : "mobile-nav-item"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
          <span>Tài khoản</span>
        </Link>
      </nav>
    </>
  );
}
