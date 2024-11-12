import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [{
      protocol: "https",
      hostname: `*.storage.tigris.dev`,
      port: "",
      pathname: "/**",
    }]
  },
};

export default nextConfig;
