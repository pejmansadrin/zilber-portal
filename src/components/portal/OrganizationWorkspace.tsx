"use client";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, ChevronDown, ContactRound, FileText, GraduationCap, Landmark, LayoutGrid, UsersRound, UserRound, ArrowLeft, Plus } from "lucide-react";
import { EditorForm } from "./AccountWorkspace";
import { saveOrganization, saveManagedPersonal } from "@/actions/account";
import { collections, organizationFields, personalSections } from "@/lib/account-fields";
import type { EmployeeRecord } from "@/types/employee";
import { Avatar } from "./PortalShell";
import { ManagedRecordDetails } from "./ManagedRecordDetails";
import s from "./Portal.module.css";
import p from "./OrganizationWorkspace.module.css";
import back from "@/components/navigation/MobileBack.module.css";
import { profilePhotoHref } from "@/lib/profile-photo";

const sections = [
  { id: "overview", title: "خلاصه", icon: LayoutGrid },
  { id: "identity", title: "مشخصات فردی", icon: UserRound },
  { id: "contact", title: "تماس و نشانی", icon: ContactRound },
  { id: "family", title: "خانواده", icon: UsersRound },
  { id: "finance", title: "بانک و بیمه", icon: Landmark },
  { id: "career", title: "سوابق و مهارت‌ها", icon: GraduationCap },
  { id: "documents", title: "مدارک", icon: FileText },
  { id: "employment", title: "همکاری", icon: BriefcaseBusiness },
];
const groupTitles: Record<string, string> = {
  contracts: "قراردادها", reviews: "ارزیابی‌ها",
};

export function OrganizationWorkspace({ employee, records, role, directory }: {
  employee: EmployeeRecord; records: Record<string, EmployeeRecord[]>; role: string; directory: EmployeeRecord[];
}) {
  const [active, setActive] = useState("overview");
  const [dirty, setDirty] = useState(new Set<string>());
  const onDirty = (key: string, value: boolean) => setDirty(previous => {
    const next = new Set(previous); if (value) next.add(key); else next.delete(key); return next;
  });
  useEffect(() => {
    if (!dirty.size) return;
    const unload = (event: BeforeUnloadEvent) => event.preventDefault();
    const navigate = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a");
      if (link && !confirm("تغییرات ذخیره‌نشده دارید. خارج می‌شوید؟")) event.preventDefault();
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty.size]);
  const fields = [...organizationFields, {
    name: "manager_id", label: "سرپرست", type: "select" as const,
    choices: directory.filter(person => person.id !== employee.id).map(person => ({ value: String(person.id), label: String(person.full_name) })),
  }];
  const available = collections.filter(collection => (role === "super_admin" || collection.readOnly || collection.id === "training") &&
    (role !== "manager" || ["assets", "reviews", "training"].includes(collection.id)));
  const count = (group: string) => available.filter(collection => collection.group === group)
    .reduce((total, collection) => total + (records[collection.id]?.length || 0), 0);
  const supervisor = directory.find(person => person.id === employee.manager_id);
  const basics = [
    ["کد پرسنلی", employee.employee_number], ["عنوان شغلی", employee.job_title],
    ["واحد سازمانی", employee.department], ["سرپرست", supervisor?.full_name],
    ["شماره همراه", employee.mobile_phone], ["ایمیل", employee.personal_email || employee.email],
  ] as const;
  const photo = typeof employee.photo_storage_path === "string" && employee.photo_storage_path
    ? profilePhotoHref(employee.photo_storage_path) : null;

  return <div className={`${s.compactAccount} ${p.workspace}`}>
    {active !== "overview" && <button type="button" className={back.sectionBack} onClick={() => {
      if (dirty.size && !confirm("تغییرات ذخیره‌نشدهٔ این بخش کنار گذاشته شود؟")) return;
      setDirty(new Set());
      setActive("overview");
    }} aria-label="برگشت به خلاصهٔ پرونده">
      <ArrowLeft size={18} aria-hidden="true" style={{ transform: "rotate(180deg)" }} />برگشت به خلاصهٔ پرونده
    </button>}
    <section className={`${s.glass} ${p.header}`} aria-label="پروندهٔ کامل کاربر">
      <div className={p.identity}>
        <Avatar name={String(employee.full_name)} gender={typeof employee.gender === "string" ? employee.gender : null} src={photo} small />
        <div><h2>{String(employee.full_name)}</h2><p>{[employee.job_title, employee.department].filter(Boolean).join(" · ") || "پروندهٔ شخصی"}</p></div>
      </div>
      <span className={p.status}>{employee.archived_at ? "بایگانی‌شده" : "پروندهٔ فعال"}</span>
    </section>
    <div className={`${s.glass} ${p.navigation}`} role="tablist" aria-label="بخش‌های پرونده" onKeyDown={event => {
      const offset = event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0;
      if (!offset && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const index = event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 :
        (sections.findIndex(section => section.id === active) + offset + sections.length) % sections.length;
      setActive(sections[index].id);
      document.getElementById(`managed-tab-${sections[index].id}`)?.focus();
    }}>
      {sections.map(({ id, title, icon: Icon }) => <button key={id} type="button" role="tab"
        id={`managed-tab-${id}`} aria-controls={`managed-panel-${id}`} aria-selected={active === id}
        tabIndex={active === id ? 0 : -1} className={p.tab} onClick={() => setActive(id)}>
        <Icon size={16} aria-hidden="true" /><span>{title}</span>
        {count(id) > 0 && <small>{count(id).toLocaleString("fa-IR")}</small>}
      </button>)}
    </div>
    {sections.map(section => <div key={section.id} role="tabpanel" id={`managed-panel-${section.id}`}
      aria-labelledby={`managed-tab-${section.id}`} hidden={active !== section.id} tabIndex={0} className={p.section}>
      {section.id === "overview" && <section className={`${s.glass} ${s.panel} ${p.panel}`}>
        <div className={p.sectionHeading}><h3>پرونده در یک نگاه</h3><span>اطلاعات ثبت‌شدهٔ کاربر</span></div>
        <dl className={p.basics}>{basics.map(([label, value]) => <div key={String(label)}>
          <dt>{label}</dt><dd dir="auto">{value ? String(value) : <span className={s.muted}>ثبت نشده</span>}</dd>
        </div>)}</dl>
        <div className={p.quickLinks}>{[
          { id: "employment", label: "قراردادها و اطلاعات همکاری", icon: BriefcaseBusiness },
          { id: "documents", label: "مدارک و گواهی‌ها", icon: FileText },
          { id: "finance", label: "اطلاعات بانکی و بیمه", icon: Landmark },
          { id: "career", label: "تحصیلات و سوابق", icon: GraduationCap },
        ].map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => {
          setActive(id); document.getElementById(`managed-tab-${id}`)?.focus();
        }}><Icon size={17} aria-hidden="true" /><span>{label}<small>{count(id).toLocaleString("fa-IR")} مورد ثبت‌شده</small></span><ArrowLeft size={15} aria-hidden="true" /></button>)}</div>
        <details className={p.fullDetails}><summary>مشاهدهٔ همهٔ اطلاعات ثبت‌شده</summary><ManagedRecordDetails record={employee} /></details>
      </section>}
      {section.id === "employment" && <section className={`${s.glass} ${s.panel} ${p.panel}`}>
        <div className={p.sectionHeading}><h3>اطلاعات همکاری</h3><span>ثبت و تنظیم توسط سازمان</span></div>
        <details className={p.editor}><summary>ویرایش اطلاعات همکاری</summary><div className={p.editorBody}>
          <EditorForm fields={fields} record={employee} action={saveOrganization.bind(null, Number(employee.id), "employees")} formKey="employment" onDirty={onDirty} />
        </div></details>
      </section>}
      {role === "super_admin" && personalSections.filter(personal => personal.id === section.id || (section.id === "finance" && personal.id === "insurance")).map(personal =>
        <section key={personal.id} className={`${s.glass} ${s.panel} ${p.panel}`}>
          <div className={p.sectionHeading}><h3>{personal.title}</h3><span>ویرایش توسط مدیریت</span></div>
          <EditorForm fields={personal.fields} record={employee} action={saveManagedPersonal.bind(null, Number(employee.id), personal.id)} formKey={`personal-${personal.id}`} onDirty={onDirty} />
        </section>)}
      {available.filter(collection => collection.group === section.id).map(collection => <details key={collection.id} className={`${s.glass} ${p.collection}`}>
        <summary className={p.collectionHeading}><strong>{groupTitles[collection.id] || collection.title}</strong><span>{(records[collection.id]?.length || 0).toLocaleString("fa-IR")} مورد</span><ChevronDown size={16} aria-hidden="true" /></summary>
        <div className={p.collectionBody}>
        {!records[collection.id]?.length && <p className={p.empty}>هنوز {collection.singular} ثبت نشده است.</p>}
        {(records[collection.id] || []).map(record => <details key={String(record.id)} className={p.record}>
          <summary><span>{String(record[collection.fields[0].name] || collection.singular)}</span><small>مشاهدهٔ جزئیات</small></summary>
          {role === "super_admin" && <ManagedRecordDetails record={record} />}
          <details className={p.editor}><summary>ویرایش اطلاعات</summary><div className={p.editorBody}>
            <EditorForm fields={collection.fields.filter(field => field.type !== "file" && field.name !== "employee_feedback")} record={record}
              action={saveOrganization.bind(null, Number(employee.id), collection.table)} formKey={`${collection.id}-${record.id}`} onDirty={onDirty} />
          </div></details>
        </details>)}
        <details className={p.addRecord}><summary><Plus size={15} aria-hidden="true" /> افزودن {collection.singular}</summary><div className={p.editorBody}>
          <EditorForm fields={collection.fields.filter(field => field.type !== "file" && field.name !== "employee_feedback")}
            action={saveOrganization.bind(null, Number(employee.id), collection.table)} formKey={`${collection.id}-new`} onDirty={onDirty} />
        </div></details>
        </div>
      </details>)}
    </div>)}
  </div>;
}
