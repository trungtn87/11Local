import { VisitTracker } from "@/components/visit-tracker";
import type { Metadata } from "next";
import { publicSiteOrigin } from "@/lib/public-seo";
import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import "@fontsource/plus-jakarta-sans/vietnamese-400.css";
import "@fontsource/plus-jakarta-sans/vietnamese-500.css";
import "@fontsource/plus-jakarta-sans/vietnamese-600.css";
import "@fontsource/plus-jakarta-sans/vietnamese-700.css";
import "@fontsource/plus-jakarta-sans/vietnamese-800.css";
import "./globals.css";
import "@/components/public-page-skeleton.css";
import "@/features/demo-ui/legacy/styles/tokens.css";
import "@/features/demo-ui/legacy/styles/app.css";
import "@/features/demo-ui/legacy/styles/discovery.css";
import "@/features/demo-ui/legacy/styles/contribute.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteOrigin()),
  title: "Nhà của Gấu | Nơi lưu giữ những năm tháng yêu thương",
  description: "Nơi lưu giữ những hình ảnh, chuyến đi, dấu mốc trưởng thành và kỷ niệm của Gấu cùng gia đình.",
  alternates: { canonical: "/" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/icon.svg" },
  openGraph: {
    type: "website", locale: "vi_VN", siteName: "Nhà của Gấu",
    title: "Nhà của Gấu | Nơi lưu giữ những năm tháng yêu thương",
    description: "Nơi lưu giữ những hình ảnh, chuyến đi, dấu mốc trưởng thành và kỷ niệm của Gấu cùng gia đình.",
    url: "/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Quicksand:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}<VisitTracker /></body>
    </html>
  );
}
