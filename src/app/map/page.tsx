import type { Metadata } from "next";

import { MapCanvas } from "@/features/map/map-canvas";

export const metadata: Metadata = {
  title: "Bản đồ Cao Bằng | 11Local",
  description: "Bản đồ tương tác Cao Bằng của 11Local.",
};

export default function MapPage() {
  return <MapCanvas />;
}
