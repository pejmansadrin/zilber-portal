import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@img/sharp-wasm32/**/*", "./node_modules/@emnapi/runtime/**/*"],
  },
  compiler: { styledComponents: true },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
