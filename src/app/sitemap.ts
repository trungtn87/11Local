import type {MetadataRoute} from "next";import {absolutePublicUrl} from "@/lib/public-seo";
export default function sitemap():MetadataRoute.Sitemap{return ["/","/album","/ban-do","/dong-thoi-gian"].map(path=>({url:absolutePublicUrl(path),changeFrequency:"weekly"}));}
