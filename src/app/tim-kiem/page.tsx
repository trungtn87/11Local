import type { Metadata } from "next";
import { DemoShell } from "@/features/demo-ui/demo-shell";
import { getPublicBootstrap } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Album kỷ niệm | Nhà của Gấu",
  description: "Khám phá các album hình ảnh, chuyến đi và kỷ niệm gia đình tại Nhà của Gấu.",
  alternates: { canonical: "/tim-kiem" },
  openGraph: {
    type: "website", locale: "vi_VN", siteName: "Nhà của Gấu",
    title: "Album kỷ niệm | Nhà của Gấu",
    description: "Nơi lưu giữ những năm tháng yêu thương của Gấu cùng gia đình.",
    url: "/tim-kiem",
  },
};

export default async function SearchPage() {
  const data = await getPublicBootstrap();
  return <DemoShell pathname="/tim-kiem" {...data} />;
}
