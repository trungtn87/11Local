import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Only advertise HSTS for the public HTTPS deployment. Do not cover
  // subdomains or opt into browser preload without verifying their TLS setup.
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ],
      },
    ];
  },
  // Keep Render's existing "npm start" deployment unchanged. Optional
  // standalone output is enabled only for Nhân Hòa's isolated builder.
  ...(process.env.DEPLOY_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  async redirects() {
    return [{ source: "/map", destination: "/ban-do", permanent: true }];
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
