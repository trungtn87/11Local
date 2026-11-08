import type { MetadataRoute } from "next";
import { absolutePublicUrl } from "@/lib/public-seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/", "/admin", "/tai-khoan", "/dang-nhap",
        "/dong-gop", "/quan-ly", "/nhan-quyen", "/bao-sai", "/theo-doi",
      ],
    }],
    sitemap: absolutePublicUrl("/sitemap.xml"),
    host: absolutePublicUrl("/"),
  };
}
