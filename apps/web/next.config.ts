import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async headers() {
    const protectedCacheHeaders = [
      {
        key: "Cache-Control",
        value: "private, no-store, no-cache, max-age=0, must-revalidate",
      },
    ];

    return [
      {
        source: "/threads/:path*",
        headers: protectedCacheHeaders,
      },
      {
        source: "/api/public/threads/:path*",
        headers: protectedCacheHeaders,
      },
    ];
  },
};

export default nextConfig;
