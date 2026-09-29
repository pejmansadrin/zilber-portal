import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { collections } from "@/lib/account-fields";
import type { EmployeeRecord, EmployeeTables } from "@/types/employee";

// In-memory cache for storage signed URLs to avoid slow roundtrips on every request
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export const getAccount = cache(async () => {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  const { data: employee, error } = await client
    .from("employees")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error)
    throw new Error("دریافت اطلاعات حساب انجام نشد. لطفاً دوباره تلاش کنید.");
  let avatar: string | null = null;
  const photoPath = employee?.photo_storage_path;
  if (photoPath?.startsWith(user.id + "/")) {
    const cached = signedUrlCache.get(photoPath);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      avatar = cached.url;
    } else {
      const { data } = await client.storage
        .from("employee-files")
        .createSignedUrl(photoPath, 3600);
      if (data?.signedUrl) {
        avatar = data.signedUrl;
        // Cache for 50 minutes (signed for 60)
        signedUrlCache.set(photoPath, {
          url: data.signedUrl,
          expiresAt: now + 50 * 60 * 1000,
        });
      }
    }
  }
  return { user, employee, avatar };
});

export const getAccountRecords = cache(async (employeeId: number) => {
  const client = await createClient();
  const result = await Promise.all(
    collections.map(async (collection) => {
      const { data, error } = await client
        .from(collection.table as Exclude<keyof EmployeeTables, "employees">)
        .select("*")
        .eq("employee_id", employeeId)
        .order("id");
      if (error)
        throw new Error(
          "دریافت بخش‌های پرونده انجام نشد. لطفاً دوباره تلاش کنید.",
        );
      return [collection.id, data as unknown as EmployeeRecord[]] as const;
    }),
  );
  return Object.fromEntries(result);
});
