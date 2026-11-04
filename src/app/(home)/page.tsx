import { DemoShell } from "@/features/demo-ui/demo-shell";
import { getPublicBootstrap } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getPublicBootstrap();
  return <DemoShell pathname="/" {...data} />;
}
