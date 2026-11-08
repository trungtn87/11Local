import type { Metadata } from "next";
import { DemoShell } from "@/features/demo-ui/demo-shell";
import { getPublicBootstrap } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Album của Gấu | Nhà của Gấu",
  description: "Khám phá các album kỷ niệm, hình ảnh và địa điểm gia đình của Gấu.",
  alternates: { canonical: "/album" },
  openGraph: {
    type: "website", locale: "vi_VN", siteName: "Nhà của Gấu",
    title: "Album của Gấu | Nhà của Gấu",
    description: "Nơi lưu giữ những năm tháng yêu thương của Gấu cùng gia đình.",
    url: "/album",
  },
};

export default async function AlbumListPage() {
  const data = await getPublicBootstrap();
  return <DemoShell pathname="/album" {...data} />;
}
