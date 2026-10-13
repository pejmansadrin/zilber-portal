import { getSession } from "@/lib/auth/session";
import { getWorkReport } from "@/lib/work-reports/data";
import { renderReport } from "@/lib/work-reports/template";
import { validateContent } from "@/domain/work-reports/report";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const failure = (error: string, status: number) => Response.json({ error }, { status, headers: privateHeaders });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return failure("ابتدا وارد سامانه شوید.", 401);
  const { id } = await params;
  const report = await getWorkReport(id);
  if (!report) return failure("گزارش پیدا نشد.", 404);
  const download = new URL(request.url).searchParams.has("download");
  return new Response(await renderReport(report, !download), { headers: {
    ...privateHeaders, "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
    ...(download ? { "Content-Disposition": `attachment; filename="work-report-${report.work_date}-${report.report_number}.html"` } : {}),
  } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return failure("درخواست نامعتبر است.", 403);
  const session = await getSession();
  if (!session) return failure("نشست شما پایان یافته؛ دوباره وارد شوید.", 401);
  const { id } = await params;
  const report = await getWorkReport(id);
  if (!report) return failure("گزارش پیدا نشد.", 404);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return failure("درخواست نامعتبر است.", 415);
  // Bound streamed bodies as well as Content-Length to prevent oversized allocations.
  const reader = request.body?.getReader();
  if (!reader) return failure("گزارش خالی است.", 400);
  let bytes = 0, body = "";
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 300000) { await reader.cancel(); return failure("حجم گزارش بیش از حد مجاز است.", 413); }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  let content, revision;
  try {
    const parsed = JSON.parse(body);
    revision = parsed.revision;
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("نسخهٔ گزارش نامعتبر است.");
    content = validateContent(parsed.content);
  } catch (error) { return failure(error instanceof Error && !(error instanceof SyntaxError) ? error.message : "ساختار گزارش نامعتبر است.", 400); }
  const { data, error } = await session.client.rpc("save_daily_work_report", {
    report_id: id, expected_revision: revision, report_content: content as unknown as Json,
  });
  if (error || !data) return failure(error?.code === "40001" ? "این گزارش در صفحهٔ دیگری تغییر کرده است. قبل از بازکردن نسخهٔ جدید، از متن فعلی خروجی HTML بگیرید." : "ذخیره انجام نشد؛ متن فرم حفظ شده است. دوباره تلاش کنید.", error?.code === "40001" ? 409 : 500);
  return Response.json({ revision: data.revision, savedAt: data.saved_at }, { headers: privateHeaders });
}
