import { getCloudConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export function GET() {
  const configured = !!getCloudConfig();
  return Response.json(
    { status: configured ? "ok" : "unconfigured", version: process.env.PORTAL_VERSION || "development", commit: process.env.PORTAL_COMMIT || null },
    { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
