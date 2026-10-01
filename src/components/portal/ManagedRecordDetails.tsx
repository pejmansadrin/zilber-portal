import { collections, organizationFields, personalSections } from "@/lib/account-fields";
import { toPersianDate } from "@/lib/persian-date";
import type { EmployeeRecord } from "@/types/employee";
import s from "./Portal.module.css";
import p from "./ManagedRecordDetails.module.css";

const labels: Record<string, string> = {
  ...Object.fromEntries([...organizationFields, ...personalSections.flatMap(section => [...section.fields]), ...collections.flatMap(collection => collection.fields)].map(field => [field.name, field.label])),
  id: "شناسه پرونده", employee_id: "شناسه پرسنل", full_name: "نام کامل",
  auth_user_id: "شناسه حساب کاربری", photo_storage_path: "تصویر پروفایل",
  created_at: "تاریخ ثبت", updated_at: "آخرین به‌روزرسانی", archived_at: "تاریخ بایگانی",
  custom_fields: "اطلاعات تکمیلی", notes: "یادداشت‌ها", employee_feedback: "بازخورد کارمند",
};

function display(value: EmployeeRecord[string]) {
  if (value === null || value === "") return "ثبت نشده";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return toPersianDate(value) || value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });
  }
  return String(value);
}

// Cover every persisted field, including values without an editable form.
export function ManagedRecordDetails({ record }: { record: EmployeeRecord }) {
  return <dl className={p.details}>
    {Object.entries(record).map(([name, value]) => <div key={name} className={p.field} data-record-field={name}>
      <dt>{labels[name] || name}</dt>
      <dd>{name.endsWith("storage_path") && typeof value === "string" && value ?
        <a className={s.fileLink} href={`/account/files?path=${encodeURIComponent(value)}`} target="_blank" rel="noreferrer">مشاهدهٔ {labels[name] || "فایل"}</a> :
        <span dir="auto" className={typeof value === "object" && value !== null ? p.json : undefined}>{display(value)}</span>}
      </dd>
    </div>)}
  </dl>;
}
