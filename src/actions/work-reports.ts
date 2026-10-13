"use server";
import { requireSession } from "@/lib/auth/session";
import { getWorkReports } from "@/lib/work-reports/data";

export async function openDailyWorkReport() {
  const { client } = await requireSession();
  const { data, error } = await client.rpc("open_daily_work_report", {});
  if (error || !data) return { error: "آماده‌سازی گزارش امروز انجام نشد؛ دوباره تلاش کنید." };
  return { report: { id: data.id, work_date: data.work_date, report_number: data.report_number, saved_at: data.saved_at, revision: data.revision } };
}
export async function listWorkReports(page: number) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error("صفحه نامعتبر است.");
  return getWorkReports(page);
}
