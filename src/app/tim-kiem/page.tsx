import type { Metadata } from "next";
import { DemoShell } from "@/features/demo-ui/demo-shell";
import { getPublicBootstrap } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tìm địa điểm ở Cao Bằng | 11Local",
  description: "Khám phá các địa điểm, dịch vụ và trải nghiệm đã được kiểm duyệt tại Cao Bằng.",
  alternates: { canonical: "/tim-kiem" },
  openGraph: {
    type: "website", locale: "vi_VN", siteName: "11Local",
    title: "Tìm địa điểm ở Cao Bằng | 11Local",
    description: "Tìm các địa điểm và trải nghiệm địa phương tại Cao Bằng.",
    url: "/tim-kiem",
  },
};

export default async function SearchPage() {
  const data = await getPublicBootstrap();
  return <DemoShell pathname="/tim-kiem" {...data} />;
}
