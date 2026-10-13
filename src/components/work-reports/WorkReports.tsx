"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, FileText, RefreshCw } from "lucide-react";
import { openDailyWorkReport, listWorkReports } from "@/actions/work-reports";
import { jalaliReportDate, reportNumber, type ReportSummary } from "@/domain/work-reports/report";
import s from "./WorkReports.module.css";

export function WorkReports() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selected, setSelected] = useState<ReportSummary | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [ready, setReady] = useState(false);
  const [frameVersion, setFrameVersion] = useState(0);
  const dirty = useRef(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const loading = useRef(false);

  const openToday = useCallback(async () => {
    if (loading.current) return;
    if (dirty.current && !window.confirm("تغییرات هنوز ذخیره نشده‌اند. از این گزارش خارج شوید؟")) return;
    loading.current = true; setBusy(true); setError("");
    try {
      const result = await openDailyWorkReport();
      if (!result.report) throw new Error(result.error);
      const list = await listWorkReports(1);
      setReports([result.report, ...list.reports.filter(item => item.id !== result.report.id)]);
      setHasMore(list.hasMore); setPage(1);
      dirty.current = false; setReady(false); setFrameVersion(version => version + 1); setSelected(result.report);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "دریافت گزارش‌ها انجام نشد."); }
    finally { loading.current = false; setBusy(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void openToday(); }, 0);
    return () => window.clearTimeout(timer);
  }, [openToday]);
  useEffect(() => {
    function message(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.id !== selected?.id) return;
      if (event.data.type === "work-report-ready") setReady(true);
      if (event.data.type === "work-report-dirty") dirty.current = true;
      if (event.data.type === "work-report-saved") {
        dirty.current = Boolean(event.data.dirty);
        setReports(items => items.map(item => item.id === selected?.id ? { ...item, saved_at: event.data.savedAt, revision: event.data.revision } : item));
      }
    }
    function leave(event: BeforeUnloadEvent) { if (dirty.current) { event.preventDefault(); event.returnValue = ""; } }
    function navigate(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (dirty.current && target && !target.hasAttribute("download") && target.getAttribute("target") !== "_blank"
        && !window.confirm("گزارش ذخیره نشده است. از این صفحه خارج شوید؟")) { event.preventDefault(); event.stopPropagation(); }
    }
    window.addEventListener("message", message);
    window.addEventListener("beforeunload", leave);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("message", message); window.removeEventListener("beforeunload", leave); document.removeEventListener("click", navigate, true); };
  }, [selected?.id]);

  async function changePage(next: number) {
    setBusy(true); setError("");
    try { const result = await listWorkReports(next); setReports(result.reports); setHasMore(result.hasMore); setPage(next); }
    catch { setError("دریافت فهرست انجام نشد؛ دوباره تلاش کنید."); }
    finally { setBusy(false); }
  }
  function select(report: ReportSummary) {
    if (report.id === selected?.id) return;
    if (dirty.current && !window.confirm("تغییرات هنوز ذخیره نشده‌اند. گزارش دیگری باز شود؟")) return;
    dirty.current = false; setReady(false); setSelected(report);
  }

  return <section className={s.workspace}>
    <div className={s.heading}>
      <div><h1><FileText size={24} aria-hidden="true" />گزارش کار</h1><p>گزارش امروز را تکمیل، ذخیره و با همان قالب چاپ کنید.</p></div>
      <button type="button" onClick={() => void openToday()} disabled={busy}><CalendarDays size={18} aria-hidden="true" />گزارش امروز</button>
    </div>
    {error && <div role="alert" className={s.error}>{error}<button onClick={() => void openToday()} disabled={busy}><RefreshCw size={16} />تلاش دوباره</button></div>}
    <div className={s.history} aria-label="گزارش‌های من">
      <div className={s.historyTitle}><h2>گزارش‌های من</h2><span>هر روز یک شمارهٔ ثابت برای گزارش شما</span></div>
      <div className={s.reports}>
        {reports.map(report => <button type="button" key={report.id} onClick={() => select(report)} aria-pressed={report.id === selected?.id}>
          <strong>{jalaliReportDate(report.work_date)}</strong><small>{report.saved_at ? "ذخیره‌شده" : "پیش‌نویس"}</small>
        </button>)}
        {busy && <span role="status">در حال آماده‌سازی…</span>}
      </div>
      {(page > 1 || hasMore) && <div className={s.pagination}><button disabled={busy || page === 1} onClick={() => void changePage(page - 1)}>جدیدتر</button><span>صفحهٔ {page.toLocaleString("fa-IR")}</span><button disabled={busy || !hasMore} onClick={() => void changePage(page + 1)}>قدیمی‌تر</button></div>}
    </div>
    {selected && <div className={s.editor} inert={busy} aria-busy={busy}>
      <div className={s.editorHeading}><span>شمارهٔ گزارش: <b dir="ltr">{reportNumber(selected)}</b></span><a href={`/work-reports/${selected.id}/form?download=1`} download>دریافت نسخهٔ ذخیره‌شده</a></div>
      {!ready && <p role="status" className={s.loading}>فرم در حال آماده‌سازی است…</p>}
      <iframe key={`${selected.id}-${frameVersion}`} ref={frame} className={s.frame} title={`فرم گزارش کار ${jalaliReportDate(selected.work_date)}`}
        src={`/work-reports/${selected.id}/form`} sandbox="allow-scripts allow-same-origin allow-modals allow-downloads" />
    </div>}
  </section>;
}
