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
        hostname: '*.s3.amazonaws.com',
        port: "",
        pathname: "/**",
      }
    ]
  }
};

export default nextConfig;
