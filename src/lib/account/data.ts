import "server-only";
import { cache } from "react";
import { getAccessRole, requireSession } from "@/lib/auth/session";
import { collections } from "@/lib/account-fields";
import type { EmployeeRecord, EmployeeTables } from "@/types/employee";
import { profilePhotoHref } from "@/lib/profile-photo";

export const getAccount = cache(async () => {
  const { client, user } = await requireSession();
  const [{ data: employee, error }, accessRole] = await Promise.all([
    client.from("employees").select("*").eq("auth_user_id", user.id).maybeSingle(),
    getAccessRole(),
  ]);
  if (error)
    throw new Error("دریافت اطلاعات حساب انجام نشد. لطفاً دوباره تلاش کنید.");
  const photoPath = employee?.photo_storage_path;
  const avatar = photoPath?.startsWith(user.id + "/") ? profilePhotoHref(photoPath) : null;
  return { user, employee, avatar, accessRole };
});

export const getAccountRecords = cache(async (employeeId: number) => {
  const { client } = await requireSession();
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
