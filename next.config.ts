import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Brand images up to 4 MB plus form overhead.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
