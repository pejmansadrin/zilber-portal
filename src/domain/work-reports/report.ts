export const fieldKeys = ["attach", "recipient", "dept", "weekFrom", "weekTo", "month", "year", "volume"] as const;
export const listKeys = ["tasks", "problems", "futureTasks"] as const;
export type ReportContent = {
  v: 1;
  period: "daily" | "weekly" | "monthly";
  fields: Record<(typeof fieldKeys)[number], string>;
  lists: Record<(typeof listKeys)[number], { text: string; time: string }[]>;
  printEmptyRows: boolean;
};
export type WorkReport = {
  id: string; user_id: string; work_date: string; report_number: number;
  reporter_name: string; username: string; department: string; template_version: number;
  content: ReportContent | Record<string, never>; revision: number;
  created_at: string; updated_at: string; saved_at: string | null;
};
export type ReportSummary = Pick<WorkReport, "id" | "work_date" | "report_number" | "saved_at" | "revision">;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("ساختار گزارش نامعتبر است.");
  return value as Record<string, unknown>;
}
function text(value: unknown, limit: number) {
  if (typeof value !== "string" || value.length > limit) throw new Error("متن گزارش بیش از حد طولانی یا نامعتبر است.");
  return value.replace(/\u0000/g, "");
}
export function validateContent(input: unknown): ReportContent {
  const data = object(input), fields = object(data.fields), lists = object(data.lists);
  if (data.v !== 1 || !["daily", "weekly", "monthly"].includes(String(data.period)) || typeof data.printEmptyRows !== "boolean")
    throw new Error("دوره یا تنظیمات گزارش نامعتبر است.");
  const result: ReportContent = {
    v: 1, period: data.period as ReportContent["period"], printEmptyRows: data.printEmptyRows,
    fields: Object.fromEntries(fieldKeys.map(key => [key, text(fields[key] ?? "", 10000)])) as ReportContent["fields"],
    lists: Object.fromEntries(listKeys.map(key => {
      const rows = lists[key];
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100) throw new Error("هر بخش باید بین ۱ تا ۱۰۰ ردیف داشته باشد.");
      return [key, rows.map(row => { const item = object(row); return { text: text(item.text, 10000), time: text(item.time, 200) }; })];
    })) as ReportContent["lists"],
  };
  if (new TextEncoder().encode(JSON.stringify(result)).length > 250000) throw new Error("حجم گزارش بیش از حد مجاز است.");
  return result;
}
export function jalaliReportDate(day: string) {
  return new Intl.DateTimeFormat("fa-IR-u-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(day + "T12:00:00Z"));
}
export function reportNumber(report: Pick<WorkReport, "work_date" | "report_number">) {
  return `WR-${jalaliReportDate(report.work_date).replaceAll("/", "")}-${String(report.report_number).padStart(6, "0")}`;
}
export function reportDefaults(report: WorkReport): ReportContent {
  return { v: 1, period: "daily", printEmptyRows: true,
    fields: { attach: "ندارد", recipient: "به مدیریت", dept: report.department, weekFrom: "", weekTo: "", month: "", year: "", volume: "" },
    lists: { tasks: [{ text: "", time: "" }], problems: [{ text: "", time: "" }], futureTasks: [{ text: "", time: "" }] } };
}
export function formData(report: WorkReport) {
  const data = report.saved_at ? validateContent(report.content) : reportDefaults(report);
  return { ...data, fields: { ...data.fields, fileNo: reportNumber(report), reporter: report.reporter_name,
    username: report.username, reportDate: jalaliReportDate(report.work_date), dayDate: jalaliReportDate(report.work_date) } };
}
