import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.50.242", "192.168.50.15", "localhost", "127.0.0.1"],
  /** 菜单 ZIP 恢复等上传较大时使用；见 README 中 Nginx `client_max_body_size` 说明 */
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
  /**
   * Next 16 默认用 Turbopack 构建；若仅有 webpack 配置会报错。
   * 空对象表示「显式启用 Turbopack 配置位」，与下方仅用于 `next dev --webpack` 的 webpack 钩子并存。
   */
  turbopack: {},
  /** `next dev --webpack` 时忽略 `.cursor` 等目录，避免本地调试日志写入仓库触发无意义重编译 */
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: ["**/node_modules/**", "**/.cursor/**", "**/debug-*.log"],
      };
    }
    return config;
  },
  images: {
    // Use original files directly. This avoids _next/image 400 errors
    // in LAN/Docker deployments when optimizer cannot decode some uploads.
    unoptimized: true,
  },
};

export default nextConfig;
