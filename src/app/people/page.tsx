import Link from "next/link";
import { Check, Search } from "lucide-react";
import { getAccount } from "@/lib/account/data";
import { createClient } from "@/lib/supabase/server";
import { Avatar, PortalShell } from "@/components/portal/PortalShell";
import { profilePhotoHref } from "@/lib/profile-photo";
import { OrganizationWorkspace } from "@/components/portal/OrganizationWorkspace";
import { DirectoryDisclosure } from "@/components/portal/DirectoryDisclosure";
import { collections } from "@/lib/account-fields";
import s from "@/components/portal/Portal.module.css";
import p from "./People.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "مدیریت کاربران و پرونده‌ها | زیلبر" };

export default async function PeoplePage({ searchParams }: {
  searchParams: Promise<{ employee?: string; q?: string }>;
}) {
  const { user, employee, avatar, accessRole: role } = await getAccount();
  const client = await createClient();
  const permitted = role === "super_admin";
  const { data, error } = permitted
    ? await client.rpc("organization_directory", {})
    : { data: [], error: null };
  if (error) throw new Error("دریافت پرونده‌ها انجام نشد.");
  const directory = data || [];
  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 150);
  const normalize = (value: string) => value.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک").toLocaleLowerCase();
  const visible = directory.filter(person => [person.full_name, person.email, person.employee_number, person.department, person.job_title]
    .some(value => value && normalize(String(value)).includes(normalize(query))));
  const selected = params.employee
    ? directory.find(person => String(person.id) === params.employee)
    : visible[0];
  const items = selected ? await Promise.all(collections
    .filter(collection => (role === "super_admin" || collection.readOnly || collection.id === "training") &&
      (role !== "manager" || ["assets", "reviews", "training"].includes(collection.id)))
    .map(async collection => {
      const { data: records, error: recordsError } = await client.rpc("organization_records", {
        target: Number(selected.id), area: collection.table,
      });
      if (recordsError) throw new Error("دریافت جزئیات پرونده انجام نشد.");
      return [collection.id, records || []] as const;
    })) : [];

  return <PortalShell gender={employee?.gender} accessRole={role} name={employee?.full_name || user.email || "زیلبر"} avatar={avatar}
    role={role === "super_admin" ? "سوپرادمین" : role === "hr_admin" ? "ادمین منابع انسانی" : role === "manager" ? "سرپرست" : "همکار زیلبر"}>
    <div className={`${s.pageTitle} ${p.pageTitle}`}>
      <div><h1 className={s.heading}>{role === "super_admin" ? "پنل سوپرادمین" : "مدیریت پرونده‌ها"}</h1>
        <p className={s.muted}>مدیریت کاربران، اطلاعات شخصی و پرونده‌های همکاری</p>
      </div>
      <Link href="/account" className={s.secondary}>حساب من</Link>
    </div>
    {!permitted ? <p role="alert">شما به پنل سوپرادمین دسترسی ندارید.</p> :
      <div className={p.layout}>
        <DirectoryDisclosure selectedName={selected ? String(selected.full_name) : "کاربر موردنظر را انتخاب کنید"} defaultOpen={Boolean(query)}>
          <nav className={`${s.glass} ${s.panel} ${p.directory}`} aria-label="انتخاب پرونده">
          <h2>کاربران · {directory.length.toLocaleString("fa-IR")} نفر</h2>
          <form action="/people" className={p.search} role="search">
            <label htmlFor="people-search">جست‌وجوی نام، ایمیل یا کد پرسنلی</label>
            <input id="people-search" name="q" type="search" defaultValue={query} maxLength={150} placeholder="نام، ایمیل یا کد پرسنلی" />
            <button className={s.secondary} type="submit" aria-label="جست‌وجوی کاربران" title="جست‌وجو"><Search size={14} aria-hidden="true" /></button>
            {query && <Link href="/people" className={s.fileLink}>همهٔ کاربران</Link>}
          </form>
          <div className={p.list}>{visible.map(person => <Link
            className={`${p.person} ${selected?.id === person.id ? p.selected : ""}`}
            aria-current={selected?.id === person.id ? "page" : undefined}
            key={String(person.id)} href={`/people?employee=${person.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>
            <span className={p.personIcon}><Avatar small name={String(person.full_name)} gender={typeof person.gender === "string" ? person.gender : null} src={profilePhotoHref(typeof person.photo_storage_path === "string" ? person.photo_storage_path : null)} /></span>
            <span className={p.personMeta}>
              <strong>{String(person.full_name)}</strong>
              {(person.archived_at || person.job_title || person.department) && <small>{person.archived_at ? "بایگانی‌شده" : [person.job_title, person.department].filter(Boolean).join(" · ")}</small>}
            </span>
            {selected?.id === person.id && <Check className={p.selectedCheck} size={18} aria-hidden="true" />}
          </Link>)}</div>
          {!visible.length && <p className={s.muted}>کاربری با این مشخصات پیدا نشد.</p>}
          </nav>
        </DirectoryDisclosure>
        <div className={p.content}>{selected ? <OrganizationWorkspace key={String(selected.id)} employee={selected} directory={directory}
          records={Object.fromEntries(items)} role={role || "employee"} /> :
          <p className={s.muted}>{params.employee ? "پرونده پیدا نشد یا در دسترس شما نیست." : "برای مشاهده و تنظیم اطلاعات، یک پرونده را انتخاب کنید."}</p>}
        </div>
      </div>}
  </PortalShell>;
}
