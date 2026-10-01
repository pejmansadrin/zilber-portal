import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compiler: { styledComponents: true },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
