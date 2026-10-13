import { getAccount } from "@/lib/account/data";
import { AttendanceWorkspace } from "@/components/attendance/AttendanceWorkspace";

import { getWorkData } from "@/lib/attendance/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "حضور و غیاب | پورتال زیلبر" };

export default async function AttendancePage() {
  const { user, employee } = await getAccount();
  const { days, requests } = await getWorkData();
  return <AttendanceWorkspace days={days} requests={requests} initialTime={new Date().toISOString()} name={employee?.full_name || String(user.user_metadata.full_name || "همکار زیلبر")} />;
}
