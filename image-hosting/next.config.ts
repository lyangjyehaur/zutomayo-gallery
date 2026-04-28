import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["qiniu", "ioredis"],
};

export default nextConfig;
