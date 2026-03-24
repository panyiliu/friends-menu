import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.50.242", "192.168.50.15", "localhost", "127.0.0.1"],
  images: {
    // Use original files directly. This avoids _next/image 400 errors
    // in LAN/Docker deployments when optimizer cannot decode some uploads.
    unoptimized: true,
  },
};

export default nextConfig;
