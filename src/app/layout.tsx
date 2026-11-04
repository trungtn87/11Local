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
  title: "11Local | Khám phá Cao Bằng",
  description: "Cẩm nang địa điểm và trải nghiệm địa phương tại Cao Bằng.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", locale: "vi_VN", siteName: "11Local",
    title: "11Local | Khám phá Cao Bằng",
    description: "Cẩm nang địa điểm và trải nghiệm địa phương tại Cao Bằng.",
    url: "/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
