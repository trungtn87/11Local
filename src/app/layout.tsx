import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bản đồ Cao Bằng | 11Local",
  description: "Khám phá Cao Bằng trên bản đồ 11Local.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body>{children}</body>
    </html>
  );
}
