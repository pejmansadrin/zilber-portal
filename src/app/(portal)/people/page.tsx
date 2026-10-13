import Link from "next/link";
import { getAccount } from "@/lib/account/data";
import { createClient } from "@/lib/supabase/server";
import { PeopleDirectory } from "@/components/portal/PeopleDirectory";
import { matchesDirectorySearch } from "@/lib/directory-search";
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
  const { accessRole: role } = await getAccount();
  const client = await createClient();
  const permitted = role === "super_admin";
  const { data, error } = permitted
    ? await client.rpc("organization_directory", {})
    : { data: [], error: null };
  if (error) throw new Error("دریافت پرونده‌ها انجام نشد.");
  const directory = data || [];
  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 150);
  const visible = directory.filter(person => matchesDirectorySearch(
    [person.full_name, person.email, person.employee_number, person.department, person.job_title], query,
  ));
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

  return <>
    <div className={`${s.pageTitle} ${p.pageTitle}`}>
      <div><h1 className={s.heading}>{role === "super_admin" ? "پنل مدیریت" : "مدیریت پرونده‌ها"}</h1>
        <p className={s.muted}>مدیریت کاربران، اطلاعات شخصی و پرونده‌های همکاری</p>
      </div>
      <div className={s.secondary}>{permitted && <Link href="/admin/attendance">حضور و غیاب و درخواست‌ها</Link>} · <Link href="/account">حساب من</Link></div>
    </div>
    {!permitted ? <p role="alert">شما به پنل مدیریت دسترسی ندارید.</p> :
      <div className={p.layout}>
        <DirectoryDisclosure selectedName={selected ? String(selected.full_name) : "کاربر موردنظر را انتخاب کنید"} defaultOpen={Boolean(query)}>
          <PeopleDirectory selectedId={selected ? String(selected.id) : undefined} directory={directory.map(person => ({
            id: String(person.id), full_name: String(person.full_name),
            email: typeof person.email === "string" ? person.email : null,
            employee_number: person.employee_number == null ? null : String(person.employee_number),
            department: typeof person.department === "string" ? person.department : null,
            job_title: typeof person.job_title === "string" ? person.job_title : null,
            gender: typeof person.gender === "string" ? person.gender : null,
            photo_href: profilePhotoHref(typeof person.photo_storage_path === "string" ? person.photo_storage_path : null),
            archived: Boolean(person.archived_at),
          }))} />
        </DirectoryDisclosure>
        <div className={p.content}>{selected ? <OrganizationWorkspace key={String(selected.id)} employee={selected} directory={directory}
          records={Object.fromEntries(items)} role={role || "employee"} /> :
          <p className={s.muted}>{params.employee ? "پرونده پیدا نشد یا در دسترس شما نیست." : "برای مشاهده و تنظیم اطلاعات، یک پرونده را انتخاب کنید."}</p>}
        </div>
      </div>}
  </>;
}
