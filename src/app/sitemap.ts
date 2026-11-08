import type { MetadataRoute } from "next";
import { absolutePublicUrl } from "@/lib/public-seo";

// The former 11Local location catalog is no longer public content.
// Family memories are indexed only through routes specifically designed for them.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absolutePublicUrl("/"), changeFrequency: "weekly" },
    { url: absolutePublicUrl("/album"), changeFrequency: "weekly" },
    { url: absolutePublicUrl("/ban-do"), changeFrequency: "monthly" },
    { url: absolutePublicUrl("/dong-thoi-gian"), changeFrequency: "weekly" },
  ];
}
