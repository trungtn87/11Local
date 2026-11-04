import { notFound, permanentRedirect } from "next/navigation";

export default async function LegacyPlaceUrl({ params }: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) notFound();
  permanentRedirect("/dia-diem/" + encodeURIComponent(slug));
}
