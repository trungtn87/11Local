import type { MetadataRoute } from "next";
import { absolutePublicUrl } from "@/lib/public-seo";
import { getPublishedSitemapEntries } from "@/lib/public-place-detail";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Failing to read Neon must not silently publish an empty sitemap.
  const places = await getPublishedSitemapEntries();
  const urls: MetadataRoute.Sitemap = [
    { url: absolutePublicUrl("/"), changeFrequency: "daily" },
    { url: absolutePublicUrl("/tim-kiem"), changeFrequency: "daily" },
  ];
  for (const place of places) {
    const lastModified = place.updatedAt && !Number.isNaN(place.updatedAt.getTime())
      ? place.updatedAt : undefined;
    urls.push({
      url: absolutePublicUrl("/dia-diem/" + encodeURIComponent(place.slug)),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly",
    });
  }
  return urls;
}
