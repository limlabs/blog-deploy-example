import type { NextConfig } from "next";
import { RemotePattern } from "next/dist/shared/lib/image-config";

const remotePatterns: RemotePattern[] = [];
if (process.env.BLOB_READ_WRITE_TOKEN) {
  const rwToken = process.env.BLOB_READ_WRITE_TOKEN as string;
  const subdomain = rwToken.substring(
    'vercel_blob_rw_'.length,
    rwToken.lastIndexOf('_')
  ).toLowerCase();

  const hostname = `${subdomain}.public.blob.vercel-storage.com`;
  remotePatterns.push({
    protocol: 'https',
    hostname,
    port: '',
    pathname: '/**',
  });
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns,
  }
};

export default nextConfig;
