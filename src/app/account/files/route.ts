import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const path = request.nextUrl.searchParams.get("path");
  const { data: role } = await client.rpc("portal_access", {});
  if (!path || path.includes("..") || (!path.startsWith(user.id + "/") && role !== "super_admin"))
    return new NextResponse("Not found", { status: 404 });
  const { data, error } = await client.storage
    .from("employee-files")
    .createSignedUrl(path, 60);
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
