import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
