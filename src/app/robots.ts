import type {MetadataRoute} from "next";import {absolutePublicUrl} from "@/lib/public-seo";
export default function robots():MetadataRoute.Robots{return {rules:[{userAgent:"*",allow:"/",disallow:["/api/","/admin","/tai-khoan","/dang-nhap","/dong-gop"]}],sitemap:absolutePublicUrl("/sitemap.xml")};}
