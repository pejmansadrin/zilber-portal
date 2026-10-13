import { requireSession } from "@/lib/auth/session";
import { WorkReports } from "@/components/work-reports/WorkReports";

export const dynamic = "force-dynamic";
export const metadata = { title: "گزارش کار | پورتال زیلبر" };
export default async function WorkReportsPage() {
  await requireSession();
  return <WorkReports />;
}
