import type { Metadata } from "next";
import { DemoShell } from "@/features/demo-ui/demo-shell";

// Legacy CSR-only routes do not have meaningful public HTML yet.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DemoRoute() {
  return <DemoShell />;
}
