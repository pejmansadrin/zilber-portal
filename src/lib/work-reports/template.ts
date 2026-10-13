import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { formData, reportDefaults, type WorkReport } from "@/domain/work-reports/report";

const template = readFile(path.join(process.cwd(), "src/templates/work-report-v1.html"), "utf8");
function json(value: unknown) { return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029"); }

export async function renderReport(report: WorkReport, embedded = true) {
  if (report.template_version !== 1) throw new Error("نسخهٔ قالب گزارش پشتیبانی نمی‌شود.");
  let html = (await template).replace("__REPORT_DATA__", () => json({ ...formData(report), exportId: `${report.id}-r${report.revision}`, exportedAt: report.updated_at }));
  if (embedded) html = html.replace("</head>", () => `<script type="application/json" id="portalContext">${json({
    id: report.id, revision: report.revision, defaults: { ...formData(report), ...reportDefaults(report), fields: { ...formData(report).fields, ...reportDefaults(report).fields } },
  })}</script></head>`);
  return html;
}
