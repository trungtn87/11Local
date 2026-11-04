import type { MetadataRoute } from "next";
import { absolutePublicUrl } from "@/lib/public-seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/", "/admin", "/quan-ly", "/tai-khoan",
        "/dang-nhap", "/nhan-quyen", "/bao-sai",
        "/theo-doi", "/dong-gop",
      ],
    }],
    sitemap: absolutePublicUrl("/sitemap.xml"),
    host: absolutePublicUrl("/"),
  };
}
