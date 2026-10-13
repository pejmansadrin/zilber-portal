import "server-only";
import { requireSession } from "@/lib/auth/session";
import type { WorkReport } from "@/domain/work-reports/report";

export async function getWorkReports(page = 1) {
  const { client, user } = await requireSession();
  const offset = (page - 1) * 30;
  const { data, error } = await client.from("portal_work_reports")
    .select("id,work_date,report_number,saved_at,revision")
    .eq("user_id", user.id).order("work_date", { ascending: false }).range(offset, offset + 30);
  if (error) throw new Error("دریافت گزارش‌ها انجام نشد. لطفاً دوباره تلاش کنید.");
  return { reports: (data || []).slice(0, 30), hasMore: (data?.length || 0) > 30 };
}

export async function getWorkReport(id: string): Promise<WorkReport | null> {
  const { client, user } = await requireSession();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await client.from("portal_work_reports").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("دریافت گزارش انجام نشد.");
  return data;
}
