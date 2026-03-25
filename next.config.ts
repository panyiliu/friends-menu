import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.50.242", "192.168.50.15", "localhost", "127.0.0.1"],
  /** 菜单 ZIP 恢复等上传较大时使用；见 README 中 Nginx `client_max_body_size` 说明 */
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
  images: {
    // Use original files directly. This avoids _next/image 400 errors
    // in LAN/Docker deployments when optimizer cannot decode some uploads.
    unoptimized: true,
  },
};

export default nextConfig;
