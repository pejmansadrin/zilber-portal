import { ShieldCheck } from "lucide-react";
import { getAccount, getAccountRecords } from "@/lib/account/data";
import { PortalShell } from "@/components/portal/PortalShell";
import { AccountWorkspace } from "@/components/portal/AccountWorkspace";
import s from "@/components/portal/Portal.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "حساب من | پورتال زیلبر" };
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { user, employee, avatar } = await getAccount();
  const { section } = await searchParams;
  const name =
    employee?.full_name ||
    String(user.user_metadata.full_name || "همکار زیلبر");
  const records = employee ? await getAccountRecords(employee.id) : {};
  return (
    <PortalShell
      name={name}
      avatar={avatar}
      email={user.email}
      role={[employee?.job_title, employee?.department].filter(Boolean).join(" · ")}
      variant="dashboard"
    >
      <div className={s.pageTitle}>
        <div>
          <p className={s.eyebrow}>فضای شخصی شما</p>
          <h1 className={s.heading}>حساب من</h1>
          <p className={s.muted}>اطلاعات درست و به‌روز، شروع یک همکاری بهتر.</p>
        </div>
        <span className={s.badge}>
          <ShieldCheck size={14} />
          پروندهٔ شخصی
        </span>
      </div>
      {employee ? (
        <AccountWorkspace
          employee={employee}
          avatar={avatar}
          records={records}
          email={user.email || ""}
          initialSection={section || "identity"}
        />
      ) : (
        <section className={`${s.glass} ${s.panel}`}>
          <h2>پروندهٔ پرسنلی شما هنوز متصل نشده است.</h2>
          <p className={s.muted}>
            برای اتصال حساب به پروندهٔ کارمند، با مسئول سامانه تماس بگیرید.
          </p>
        </section>
      )}
    </PortalShell>
  );
}
