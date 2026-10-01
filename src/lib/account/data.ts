import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { collections } from "@/lib/account-fields";
import type { EmployeeRecord, EmployeeTables } from "@/types/employee";
import { profilePhotoHref } from "@/lib/profile-photo";

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
  const photoPath = employee?.photo_storage_path;
  const avatar = photoPath?.startsWith(user.id + "/") ? profilePhotoHref(photoPath) : null;
  const { data: accessRole, error: accessError } = await client.rpc("portal_access", {});
  if (accessError) throw new Error("دریافت سطح دسترسی حساب انجام نشد.");
  return { user, employee, avatar, accessRole };
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
