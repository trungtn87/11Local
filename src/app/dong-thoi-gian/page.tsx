import type { Metadata } from "next";
import { DemoShell } from "@/features/demo-ui/demo-shell";
import { getPublicBootstrap } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gấu lớn lên — Dòng thời gian | Nhà của Gấu",
  description: "Theo dõi các dấu mốc trưởng thành và kỷ niệm của Gấu theo từng năm tháng.",
  alternates: { canonical: "/dong-thoi-gian" },
  openGraph: {
    type: "website", locale: "vi_VN", siteName: "Nhà của Gấu",
    title: "Gấu lớn lên — Dòng thời gian | Nhà của Gấu",
    description: "Dòng thời gian lưu giữ các cột mốc và kỷ niệm của Gấu cùng gia đình.",
    url: "/dong-thoi-gian",
  },
};

export default async function TimelineRoutePage() {
  const data = await getPublicBootstrap();
  return <DemoShell pathname="/dong-thoi-gian" {...data} />;
}
