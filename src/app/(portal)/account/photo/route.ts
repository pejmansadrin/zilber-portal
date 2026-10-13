import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };

export async function GET(request: NextRequest) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401, headers: privateHeaders });
  const path = request.nextUrl.searchParams.get("path");
  if (!path || path.includes("..")) return new NextResponse(null, { status: 404, headers: privateHeaders });
  if (!path.startsWith(user.id + "/")) {
    const { data: role, error } = await client.rpc("portal_access", {});
    if (error || role !== "super_admin") return new NextResponse(null, { status: 404, headers: privateHeaders });
  }
  // Download with the viewer's session: storage RLS still checks every request.
  const { data, error } = await client.storage.from("employee-files").download(path);
  if (error || !data || !["image/jpeg", "image/png", "image/webp"].includes(data.type)) {
    return new NextResponse(null, { status: 404, headers: privateHeaders });
  }
  return new NextResponse(await data.arrayBuffer(), {
    headers: { ...privateHeaders, "Content-Type": data.type, "Content-Disposition": "inline" },
  });
}
