import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
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
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "@/features/demo-ui/legacy/styles/tokens.css";
import "@/features/demo-ui/legacy/styles/app.css";
import "@/features/demo-ui/legacy/styles/discovery.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "11Local | Khám phá Cao Bằng",
  description: "Cẩm nang địa điểm và trải nghiệm địa phương tại Cao Bằng.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>{children}</body>
    </html>
  );
}
