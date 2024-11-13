import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(process.env.CDN_URL ?? 'http://localhost:3000').hostname,
        port: "",
        pathname: "/**",
      }
    ]
  }
};

export default nextConfig;
