import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { publicSiteOrigin } from "@/lib/public-seo";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/500-italic.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteOrigin()),
  title: "Gia đình Gấu | Nơi lưu giữ những năm tháng yêu thương",
  description: "Album, chuyến đi và kỷ niệm của Gấu cùng gia đình.",
  icons: { icon: "/icon.svg" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <SiteNav />
        {children}
        <footer className="footer">
          © Gia đình Gấu · <a href="/chinh-sach-bao-mat">Chính sách bảo mật</a> · <a href="/dieu-khoan-su-dung">Điều khoản</a>
        </footer>
      </body>
    </html>
  );
}
