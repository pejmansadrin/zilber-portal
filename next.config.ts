import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/app-assets.json", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Content-Type-Options", value: "nosniff" }] }, { source: "/sw.js", headers: [
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Service-Worker-Allowed", value: "/" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ] }];
  },
  outputFileTracingIncludes: {
    "/work-reports/*": ["./src/templates/work-report-v1.html"],
    "/*": ["./node_modules/sharp/src/build/Release/*.node"],
  },
  compiler: { styledComponents: true },
  experimental: { staleTimes: { dynamic: 0, static: 120 }, serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
