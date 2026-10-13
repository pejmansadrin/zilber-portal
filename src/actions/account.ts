"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAuthClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSession, getAccessRole } from "@/lib/auth/session";
import { normalizeProfilePhoto } from "@/lib/account/profile-photo";
import { getCloudConfig } from "@/lib/supabase/config";
import {
  collections,
  personalSections,
  organizationFields,
  type Field,
} from "@/lib/account-fields";
import { fromPersianDate, latinDigits } from "@/lib/persian-date";
import type { EmployeeRecord, EmployeeTables } from "@/types/employee";
export type FormResult = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};
const failure = (
  message: string,
  errors?: Record<string, string>,
): FormResult => ({ ok: false, message, errors });
async function context() {
  const session = await getSession();
  if (!session) return null;
  const { client, user } = session;
  const { data: employee } = await client
    .from("employees")
    .select("id,auth_user_id,first_name,last_name,photo_storage_path")
    .eq("auth_user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();
  return employee ? { client, user, employee } : null;
}
function values(fields: readonly Field[], form: FormData) {
  const data: Record<string, string | number | boolean | null> = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (field.type === "file") continue;
    if (field.type === "checkbox") {
      data[field.name] = form.get(field.name) === "on";
      continue;
    }
    const value = String(form.get(field.name) ?? "").trim();
    if (!value) {
      data[field.name] = null;
      if (field.required) errors[field.name] = "این قسمت را تکمیل کنید.";
      continue;
    }
    if (value.length > (field.max ?? (field.type === "textarea" ? 3000 : 250)))
      errors[field.name] = "متن واردشده طولانی است.";
    if (field.type === "date") {
      data[field.name] = fromPersianDate(value);
      if (!data[field.name])
        errors[field.name] = "تاریخ شمسی معتبر وارد کنید؛ مانند ۱۴۰۵/۰۷/۰۶.";
    } else if (field.type === "number") {
      const n = Number(latinDigits(value));
      data[field.name] = n;
      if (!Number.isFinite(n) || n < 0 || n > 1000000000000)
        errors[field.name] = "عدد معتبر و غیرمنفی وارد کنید.";
    } else {
      data[field.name] =
        ["tel", "email"].includes(field.type || "") ||
        ["national_id", "postal_code", "iban", "account_number"].includes(
          field.name,
        )
          ? latinDigits(value)
          : value;
    }
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      errors[field.name] = "ایمیل معتبر وارد کنید.";
    if (field.type === "url") {
      try {
        const u = new URL(value);
        if (!["https:", "http:"].includes(u.protocol)) throw Error();
      } catch {
        errors[field.name] = "نشانی وب معتبر وارد کنید.";
      }
    }
    if (field.type === "tel" && !/^[+\d\s()-]{3,30}$/.test(latinDigits(value)))
      errors[field.name] = "شماره تماس معتبر وارد کنید.";
    if (
      field.name === "iban" &&
      !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(
        latinDigits(value).replace(/\s/g, "").toUpperCase(),
      )
    )
      errors[field.name] = "شماره شبا را همراه پیشوند کشور وارد کنید.";
    if (field.name === "iban")
      data[field.name] = latinDigits(value).replace(/\s/g, "").toUpperCase();
  }
  for (const [start, end] of [
    ["starts_on", "ends_on"],
    ["issued_on", "expires_on"],
    ["coverage_starts_on", "coverage_ends_on"],
    ["starts_on", "completed_on"],
  ])
    if (data[start] && data[end] && String(data[end]) < String(data[start]))
      errors[end] = "تاریخ پایان باید پس از تاریخ شروع باشد.";
  return { data, errors };
}
async function upload(
  ctx: NonNullable<Awaited<ReturnType<typeof context>>>,
  file: File,
  imageOnly = false,
) {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("حداکثر حجم فایل ۵ مگابایت است.");
  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  const webp =
    Buffer.from(bytes.slice(0, 4)).toString() === "RIFF" &&
    Buffer.from(bytes.slice(8, 12)).toString() === "WEBP";
  const pdf = Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-";
  let mime = jpg
    ? "image/jpeg"
    : png
      ? "image/png"
      : webp
        ? "image/webp"
        : pdf && !imageOnly
          ? "application/pdf"
          : null;
  if (!mime)
    throw new Error(
      imageOnly
        ? "فقط تصویر JPG، PNG یا WebP قابل بارگذاری است."
        : "فقط PDF یا تصویر JPG، PNG و WebP قابل بارگذاری است.",
    );
  if (imageOnly) { bytes = await normalizeProfilePhoto(bytes); mime = "image/webp"; }
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "pdf";
  const path = `${ctx.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await ctx.client.storage
    .from("employee-files")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error("بارگذاری فایل انجام نشد. دوباره تلاش کنید.");
  return { path, mime };
}
function refreshed() {
  revalidatePath("/(portal)", "layout");
  revalidatePath("/account");
  revalidatePath("/dashboard");
}
export async function savePersonal(
  section: string,
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const config = personalSections.find((s) => s.id === section);
  if (!config) return failure("بخش نامعتبر است.");
  const ctx = await context();
  if (!ctx) return failure("برای ذخیره اطلاعات دوباره وارد حساب شوید.");
  const { data, errors } = values(config.fields, form);
  if (Object.keys(errors).length)
    return failure("موارد مشخص‌شده را اصلاح کنید.", errors);
  if (section === "identity")
    data.full_name = `${data.first_name} ${data.last_name}`;
  const { data: saved, error } = await ctx.client
    .from("employees")
    .update(data as EmployeeTables["employees"]["Update"])
    .eq("id", ctx.employee.id)
    .eq("auth_user_id", ctx.user.id)
    .select("id")
    .maybeSingle();
  if (error || !saved)
    return failure("ذخیره اطلاعات انجام نشد. دوباره تلاش کنید.");
  if (section === "identity")
    await ctx.client.auth.updateUser({
      data: {
        full_name: data.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
      },
    });
  refreshed();
  return { ok: true, message: "اطلاعات شما ذخیره شد." };
}
export async function saveRecord(
  collectionId: string,
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const config = collections.find((c) => c.id === collectionId && !c.readOnly);
  if (!config) return failure("بخش نامعتبر است.");
  const ctx = await context();
  if (!ctx) return failure("برای ذخیره اطلاعات دوباره وارد حساب شوید.");
  const { data, errors } = values(config.fields, form);
  if (Object.keys(errors).length)
    return failure("موارد مشخص‌شده را اصلاح کنید.", errors);
  const id = String(form.get("record_id") ?? "");
  if (id && !/^\d+$/.test(id)) return failure("شناسه نامعتبر است.");
  const table = config.table as Exclude<keyof EmployeeTables, "employees">;
  let previousRecord: EmployeeRecord | null = null;
  if (id) {
    const { data: existing } = await ctx.client
      .from(table)
      .select("*")
      .eq("id", Number(id))
      .eq("employee_id", ctx.employee.id)
      .maybeSingle();
    if (!existing) return failure("این رکورد در حساب شما وجود ندارد.");
    previousRecord = existing as unknown as EmployeeRecord;
  }
  const uploaded: string[] = [];
  try {
    for (const field of config.fields.filter((f) => f.type === "file")) {
      const file = form.get(field.name);
      if (file instanceof File && file.size) {
        const object = await upload(ctx, file);
        uploaded.push(object.path);
        data[field.name] = object.path;
        if (config.id === "documents") data.mime_type = object.mime;
      } else if (form.get(`remove_${field.name}`) === "on") {
        data[field.name] = null;
        if (config.id === "documents") data.mime_type = null;
      }
    }
    if (!id && config.id === "documents" && !data.storage_path)
      return failure("فایل مدرک را انتخاب کنید.");
    const query = id
      ? ctx.client
          .from(table)
          .update(data as EmployeeTables[typeof table]["Update"])
          .eq("id", Number(id))
          .eq("employee_id", ctx.employee.id)
      : ctx.client
          .from(table)
          .insert({ ...data, employee_id: ctx.employee.id });
    const { data: saved, error } = await query.select("id").maybeSingle();
    if (error || !saved) {
      if (uploaded.length)
        await ctx.client.storage.from("employee-files").remove(uploaded);
      return failure("ذخیره انجام نشد؛ فیلدها و تاریخ‌ها را بررسی کنید.");
    }
    const replacedFiles = config.fields
      .filter((field) => field.type === "file" && field.name in data)
      .map((field) => previousRecord?.[field.name])
      .filter(
        (path): path is string =>
          typeof path === "string" && path.startsWith(ctx.user.id + "/"),
      );
    if (replacedFiles.length)
      await ctx.client.storage.from("employee-files").remove(replacedFiles);
    refreshed();
    return { ok: true, message: "اطلاعات ذخیره شد." };
  } catch (error) {
    if (uploaded.length)
      await ctx.client.storage.from("employee-files").remove(uploaded);
    return failure(error instanceof Error ? error.message : "ذخیره انجام نشد.");
  }
}
export async function deleteRecord(
  collectionId: string,
  id: number,
): Promise<FormResult> {
  const config = collections.find((c) => c.id === collectionId && !c.readOnly);
  if (!config || !Number.isSafeInteger(id))
    return failure("درخواست نامعتبر است.");
  const ctx = await context();
  if (!ctx) return failure("دوباره وارد حساب شوید.");
  const { data, error } = await ctx.client
    .from(config.table as Exclude<keyof EmployeeTables, "employees">)
    .delete()
    .eq("id", id)
    .eq("employee_id", ctx.employee.id)
    .select("*");
  if (error || !data?.length)
    return failure("حذف انجام نشد. دوباره تلاش کنید.");
  const record = data[0] as unknown as EmployeeRecord;
  const files = config.fields
    .filter((field) => field.type === "file")
    .map((field) => record[field.name])
    .filter(
      (path): path is string =>
        typeof path === "string" && path.startsWith(ctx.user.id + "/"),
    );
  if (files.length)
    await ctx.client.storage.from("employee-files").remove(files);
  refreshed();
  return { ok: true, message: "رکورد حذف شد." };
}
export async function saveAvatar(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const ctx = await context();
  if (!ctx) return failure("دوباره وارد حساب شوید.");
  let newPath: string | null = null;
  try {
    const file = form.get("photo");
    if (form.get("remove") !== "on") {
      if (!(file instanceof File) || !file.size)
        return failure("یک تصویر انتخاب کنید.");
      newPath = (await upload(ctx, file, true)).path;
    }
    const { data, error } = await ctx.client
      .from("employees")
      .update({ photo_storage_path: newPath })
      .eq("id", ctx.employee.id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      if (newPath)
        await ctx.client.storage.from("employee-files").remove([newPath]);
      return failure("ذخیره تصویر انجام نشد.");
    }
    if (ctx.employee.photo_storage_path?.startsWith(ctx.user.id + "/"))
      await ctx.client.storage
        .from("employee-files")
        .remove([ctx.employee.photo_storage_path]);
    refreshed();
    for (const path of ["/people", "/attendance", "/leaves", "/admin"]) revalidatePath(path);
    return { ok: true, message: "تصویر حساب به‌روز شد." };
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "بارگذاری انجام نشد.",
    );
  }
}
export async function saveReviewFeedback(
  id: number,
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const ctx = await context();
  if (!ctx) return failure("دوباره وارد حساب شوید.");
  const feedback = String(form.get("employee_feedback") ?? "").trim();
  if (feedback.length > 3000)
    return failure("بازخورد باید کمتر از ۳۰۰۰ حرف باشد.");
  const { data, error } = await ctx.client
    .from("employee_reviews")
    .update({ employee_feedback: feedback || null })
    .eq("id", id)
    .eq("employee_id", ctx.employee.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return failure("ثبت بازخورد انجام نشد.");
  refreshed();
  return { ok: true, message: "بازخورد شما ثبت شد." };
}
export async function changePassword(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.email) return failure("دوباره وارد حساب شوید.");
  const password = String(form.get("password") ?? "");
  if (password.length < 12 || password.length > 72)
    return failure("رمز تازه باید بین ۱۲ و ۷۲ کاراکتر باشد.");
  if (password !== form.get("confirm_password"))
    return failure("تکرار رمز عبور یکسان نیست.");
  const config = getCloudConfig()!;
  const verifier = createAuthClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: check } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: String(form.get("current_password") ?? ""),
  });
  if (check) return failure("رمز عبور فعلی صحیح نیست.");
  await verifier.auth.signOut({ scope: "local" });
  const { error } = await client.auth.updateUser({ password });
  if (error)
    return failure(
      "تغییر رمز انجام نشد. رمز دیگری انتخاب کنید یا دوباره وارد شوید.",
    );
  return {
    ok: true,
    message: "رمز عبور تغییر کرد. برای ورود بعدی از رمز تازه استفاده کنید.",
  };
}

export async function saveOrganization(target: number, area: string, _previous: FormResult, form: FormData): Promise<FormResult> {
  const session = await getSession();
  if (!session || !Number.isSafeInteger(target)) return failure("دسترسی مجاز نیست.");
  const { client } = session;
  const role = await getAccessRole().catch(() => null);
  if (role !== "super_admin") return failure("دسترسی مجاز نیست.");
  const config = collections.find(c => c.table === area && (role === "super_admin" || c.readOnly || c.id === "training"));
  let fields: readonly Field[] = area === "employees" ? [...organizationFields, { name: "manager_id", label: "شناسه سرپرست", type: "number" }] : config?.fields.filter(f => f.type !== "file" && f.name !== "employee_feedback") || [];
  const personalSection = form.get("__personal_section");
  if (personalSection) {
    if (role !== "super_admin" || area !== "employees") return failure("دسترسی مجاز نیست.");
    fields = personalSections.find(s => s.id === personalSection)?.fields || [];
  }
  if (!fields.length) return failure("بخش معتبر نیست.");
  const parsed = values(fields, form);
  if (Object.keys(parsed.errors).length) return failure("اطلاعات واردشده را بررسی کنید.", parsed.errors);
  const rawId = form.get("record_id");
  const recordId = rawId ? Number(rawId) : null;
  if (recordId !== null && (!Number.isSafeInteger(recordId) || recordId <= 0)) return failure("رکورد معتبر نیست.");
  const { error } = await client.rpc("save_organization", { target, area, record_id: recordId, patch: parsed.data });
  if (error) return failure("ذخیره انجام نشد. سطح دسترسی و اطلاعات واردشده را بررسی کنید.");
  revalidatePath("/(portal)", "layout");
  return { ok: true, message: "اطلاعات سازمانی ذخیره شد." };
}

export async function saveManagedPersonal(target: number, section: string, previous: FormResult, form: FormData): Promise<FormResult> {
  form.set("__personal_section",section);
  return saveOrganization(target,"employees",previous,form);
}
