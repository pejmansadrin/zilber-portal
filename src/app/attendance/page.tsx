import { getAccount } from "@/lib/account/data";
import { PortalShell } from "@/components/portal/PortalShell";
import { AttendanceWorkspace } from "@/components/attendance/AttendanceWorkspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "حضور و غیاب | پورتال زیلبر" };

export default async function AttendancePage() {
  const { user, employee, avatar, accessRole } = await getAccount();
  return <PortalShell name={employee?.full_name || String(user.user_metadata.full_name || "همکار زیلبر")}
    avatar={avatar} email={user.email} gender={employee?.gender} accessRole={accessRole}
    role={[employee?.job_title, employee?.department].filter(Boolean).join(" · ")}>
    <AttendanceWorkspace initialTime={new Date().toISOString()} name={employee?.full_name || String(user.user_metadata.full_name || "همکار زیلبر")} />
  </PortalShell>;
}
