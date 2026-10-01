import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./node_modules/sharp/src/build/Release/*.node"],
  },
  compiler: { styledComponents: true },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
