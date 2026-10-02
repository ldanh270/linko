import type { NextConfig } from "next";

/** Prevent invitation URLs from entering referrers or browser caches. */
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/invite/:token",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Cache-Control", value: "no-store" },
      ],
    }]
  },
};

export default nextConfig;
