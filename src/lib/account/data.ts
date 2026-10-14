import "server-only";
import { cache } from "react";
import { getAccessRole, requireSession } from "@/lib/auth/session";
import { collections } from "@/lib/account-fields";
import type { EmployeeRecord, EmployeeTables } from "@/types/employee";
import { profilePhotoHref } from "@/lib/profile-photo";

// Minimal identity for shared navigation; full personnel data belongs to /account.
export const getPortalIdentity = cache(async () => {
  const { client, user } = await requireSession();
  const [{ data: employee, error }, accessRole] = await Promise.all([
    client.from("employees").select("full_name,gender,job_title,department,photo_storage_path").eq("auth_user_id", user.id).maybeSingle(),
    getAccessRole(),
  ]);
  if (error) throw new Error("دریافت اطلاعات حساب انجام نشد؛ دوباره تلاش کنید.");
  const path = employee?.photo_storage_path;
  return { user, employee, accessRole, avatar: path?.startsWith(user.id + "/") ? profilePhotoHref(path) : null };
});

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

export const accountRecordsPageSize = 20;

export async function getAccountCollection(collectionId: string, page: number, session?: Awaited<ReturnType<typeof requireSession>>) {
  const config = collections.find(collection => collection.id === collectionId);
  if (!config || !Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error("بخش انتخاب‌شده معتبر نیست.");
  const { client, user } = session ?? await requireSession();
  const { data: employee, error: ownerError } = await client.from("employees").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (ownerError || !employee) throw new Error("پروندهٔ پرسنلی در دسترس نیست.");
  const offset = (page - 1) * accountRecordsPageSize;
  const { data, error } = await client.from(config.table as Exclude<keyof EmployeeTables, "employees">)
    .select("*").eq("employee_id", employee.id).order("id").range(offset, offset + accountRecordsPageSize);
  if (error) throw new Error("دریافت این بخش انجام نشد؛ دوباره تلاش کنید.");
  return { records: (data || []).slice(0, accountRecordsPageSize) as unknown as EmployeeRecord[], hasMore: (data?.length || 0) > accountRecordsPageSize };
}
