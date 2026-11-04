"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight, BookOpen, ChevronRight, ClipboardCheck,
  FolderTree, LayoutDashboard, LogOut, MapPinned, Menu, MessageSquareText,
  Settings2, ShieldCheck, Store, X,
} from "lucide-react";
import styles from "./admin-shell.module.css";

const groups = [
  {
    title: "QUẢN LÝ",
    links: [
      { href: "/admin/dashboard", label: "Tổng quan", Icon: LayoutDashboard },
      { href: "/admin", label: "Địa điểm", Icon: MapPinned },
      { href: "/admin/danh-muc", label: "Danh mục", Icon: FolderTree },
      { href: "/admin/menu", label: "Menu & bảng giá", Icon: BookOpen },
    ],
  },
  {
    title: "KIỂM DUYỆT",
    links: [
      { href: "/admin/dong-gop", label: "Đóng góp cộng đồng", Icon: ClipboardCheck },
      { href: "/admin/danh-gia", label: "Đánh giá", Icon: MessageSquareText },
      { href: "/admin/xac-minh", label: "Xác minh chủ", Icon: ShieldCheck },
      { href: "/admin/noi-dung-chu", label: "Nội dung chủ quán", Icon: Store },
    ],
  },
  {
    title: "HỆ THỐNG",
    links: [{ href: "/admin/cai-dat/discord", label: "Cài đặt Discord", Icon: Settings2 }],
  },
];

function isCurrent(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      if (!response.ok) { setAuthenticated(false); return; }
      const result = await response.json();
      setAuthenticated(Boolean(result.authenticated));
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => checkSession());
    window.addEventListener("11local-admin-auth-changed", checkSession);
    return () => window.removeEventListener("11local-admin-auth-changed", checkSession);
  }, [checkSession, pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error("SIGN_OUT_FAILED");
      window.location.assign("/admin");
    } catch {
      setSignOutError("Không thể đăng xuất. Vui lòng thử lại.");
      setSigningOut(false);
    }
  };

  if (!authenticated) return <div className={styles.authContent}>{children}</div>;

  const currentLink = groups.flatMap(group => group.links).find(link => isCurrent(pathname, link.href));
  const pageName = currentLink?.label ?? "Quản trị";

  return <div className={styles.workspace}>
    {menuOpen && <button type="button" className={styles.backdrop}
      aria-label="Đóng menu quản trị" onClick={() => setMenuOpen(false)} />}
    <aside className={styles.sidebar} data-open={menuOpen}>
      <div className={styles.brand}>
        <div className={styles.brandMark} aria-hidden="true">11</div>
        <div className={styles.brandName}><strong>11Local</strong><span>ADMIN CONSOLE</span></div>
        <button type="button" className={styles.closeMenu} aria-label="Đóng menu"
          onClick={() => setMenuOpen(false)}><X size={20}/></button>
      </div>
      <nav aria-label="Điều hướng quản trị" className={styles.navigation}>
        {groups.map(group => <div key={group.title} className={styles.navGroup}>
          <p className={styles.groupTitle}>{group.title}</p>
          {group.links.map(({ href, label, Icon }) => <Link
            key={href} href={href} className={styles.navLink}
            aria-current={isCurrent(pathname, href) ? "page" : undefined}
            onClick={() => setMenuOpen(false)}>
            <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
            {isCurrent(pathname, href) && <ChevronRight size={15} className={styles.navChevron} aria-hidden="true" />}
          </Link>)}
        </div>)}
      </nav>
      <div className={styles.sidebarBottom}>
        <Link href="/" className={styles.websiteLink} onClick={() => setMenuOpen(false)}>
          <ArrowUpRight size={18} aria-hidden="true"/> Xem website
        </Link>
        <button type="button" className={styles.signOut} disabled={signingOut} onClick={() => void signOut()}>
          <LogOut size={18} aria-hidden="true"/>{signingOut ? "Đang đăng xuất…" : "Đăng xuất"}
        </button>
        {signOutError && <p className={styles.error} role="alert">{signOutError}</p>}
      </div>
    </aside>
    <div className={styles.mainColumn}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button type="button" className={styles.menuToggle} aria-label="Mở menu quản trị"
            aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={22}/></button>
          <div className={styles.breadcrumb}>
            <span>Quản trị</span><ChevronRight size={15} aria-hidden="true"/><strong>{pageName}</strong>
          </div>
        </div>
        <div className={styles.topbarRight}>
          <span className={styles.adminIndicator}><span/> Quản trị viên</span>
          <Link href="/" className={styles.topbarWebsite}>Trang chủ <ArrowUpRight size={16}/></Link>
        </div>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  </div>;
}
