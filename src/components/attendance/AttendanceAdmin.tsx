'use client';

import { Select } from "@/components/ui/Select";
import Link from '@/components/navigation/AppLink';
import Form from 'next/form';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reviewWork } from '@/actions/attendance-review';
import { toPersianDate } from '@/lib/persian-date';
import { requestStatus, type StoredWorkDay, type TimeRequest } from '@/types/attendance-review';
import { modeLabel } from '@/domain/attendance/work-sessions';
import { digits, format } from './timesheet-data';
import { attendanceAdminHref, attendancePageSize, type AttendanceFilters } from '@/domain/attendance/queries';
import s from './AttendanceWorkspace.module.css';
import a from './AttendanceAdmin.module.css';
import { ArrowLeft, ArrowRight, CalendarDays, ChartNoAxesGantt, CheckCheck, ChevronDown, Clock3, Inbox, ListFilter, RefreshCw, Search, Table2, Users } from 'lucide-react';
import { adminDaySummary, adminTimeline, tehranDate } from '@/domain/attendance/admin-view';
const dateLabel = (iso: string) => digits(toPersianDate(iso));
const clock = (stamp: string) => new Date(stamp).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });
function ReviewRequest({ request, name }: { request: TimeRequest; name: string }) {
 const [note, setNote] = useState(''); const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
 const [busy, startTransition] = useTransition();
 const original = request.session_index === null ? null : request.original_sessions[request.session_index];
 const oldTime = original && (request.action === 'start' ? original.start : original.end);
 function review(decision: 'approved' | 'rejected') {
  startTransition(async () => { try { setFeedback(await reviewWork(request.id, decision, note)); } catch { setFeedback({ ok: false, message: 'بررسی انجام نشد؛ دوباره تلاش کنید.' }); } });
 }
 return <article className={`${s.requestItem} ${a.request}`} data-status={request.status}>
  <div><strong>{name} · {request.kind === 'late' ? 'توضیح تأخیر' : request.requested_until ? request.mode === 'mission' ? 'ثبت مأموریت' : 'ثبت ورود و خروج' : 'ثبت یا اصلاح ساعت'}</strong><span>{dateLabel(request.work_date)} · {requestStatus[request.status]}</span></div>
  {request.kind === 'time' && <p>{request.action === 'start' ? 'ورود' : 'خروج'} {request.mode ? modeLabel(request.mode) : ''} · {request.session_index === null ? 'ثبت جاافتاده' : `ساعت قبلی: ${oldTime ? clock(oldTime) : 'ثبت نشده'}`} ← ساعت درخواستی: {request.requested_at ? `${dateLabel(new Date(request.requested_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' }))}، ${clock(request.requested_at)}` : '—'}</p>}
  {request.requested_until && <p>پایان بازهٔ درخواستی: {dateLabel(new Date(request.requested_until).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' }))}، {clock(request.requested_until)}</p>}
  <p>{request.reason}</p>
  {request.status === 'pending' ? <><label>یادداشت بررسی<textarea className={s.reviewNote} rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={2000} /></label><div className={s.reviewButtons}><button disabled={busy} onClick={() => review('approved')}>تأیید {request.kind === 'time' ? 'و اعمال ساعت' : 'توضیح'}</button><button disabled={busy} onClick={() => review('rejected')}>رد درخواست</button></div></> : <p>{request.review_note || 'بدون یادداشت'}{request.reviewed_at && ` · بررسی در ${new Date(request.reviewed_at).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}`}</p>}
  {feedback && <p role={feedback.ok ? 'status' : 'alert'}>{feedback.message}</p>}
 </article>;
}
function Pagination({ filters, kind, hasMore }: { filters: AttendanceFilters; kind: 'daysPage' | 'requestsPage'; hasMore: boolean }) {
 const current = filters[kind];
 return <nav className={a.pagination} aria-label={kind === 'daysPage' ? 'صفحه‌های تردد' : 'صفحه‌های درخواست‌ها'}>
  {current > 1 ? <Link scroll={false} href={attendanceAdminHref(filters, { [kind]: current - 1 })}><ArrowRight size={15} /> صفحهٔ قبل</Link> : <span />}
  <span>صفحهٔ {current.toLocaleString('fa-IR')} · تا {attendancePageSize.toLocaleString('fa-IR')} مورد</span>
  {hasMore ? <Link scroll={false} href={attendanceAdminHref(filters, { [kind]: current + 1 })}>صفحهٔ بعد <ArrowLeft size={15} /></Link> : <span />}
 </nav>;
}

function DayStatus({ row, asOf }: { row: StoredWorkDay; asOf: string }) {
 const day = adminDaySummary(row, asOf);
 return <span className={a.statuses}>
  {day.open ? <span className={a.warning}><i />{day.historicalOpen ? 'خروج ثبت‌نشده' : 'بازهٔ باز'}</span> : <span className={a.complete}><CheckCheck size={12} />تکمیل‌شده</span>}
  {day.lateMinutes > 0 && <span className={a.late}>{day.lateMinutes.toLocaleString('fa-IR')} دقیقه بعد از ۸</span>}
 </span>;
}

function DayTimeline({ row, asOf }: { row: StoredWorkDay; asOf: string }) {
 return <div className={a.track} aria-hidden="true">
  <div className={a.eightLine} />
  {adminTimeline(row, asOf).map(({ session, left, width, historicalOpen, overnight }, index) => <span key={index}
   className={`${a.bar} ${a[session.mode]} ${!session.end ? a.openBar : ''} ${historicalOpen ? a.unknownBar : ''}`}
   style={{ left: `${left}%`, width: historicalOpen ? '4px' : `${Math.max(width, 0.2)}%` }}
   title={`${modeLabel(session.mode)}: ${clock(session.start)} تا ${session.end ? clock(session.end) : 'خروج ثبت نشده'}${overnight ? ' · ادامه در روز بعد' : ''}`} />)}
 </div>;
}

function DayDetail({ row }: { row: StoredWorkDay }) {
 const notes = [...new Set(row.sessions.flatMap(session => {
  const note = (session as typeof session & { source_note?: unknown }).source_note;
  return typeof note === 'string' && note.trim() ? [note] : [];
 }))];
 return <div className={a.detail}>
  <div className={a.intervals}>{row.sessions.map((session, index) => <div key={index}>
   <span className={`${a.modeDot} ${a[session.mode]}`} /><strong>{modeLabel(session.mode)}</strong>
   <span>{clock(session.start)} <span className={a.muted}>تا</span> {session.end ? clock(session.end) : 'خروج ثبت نشده'}
   {session.end && tehranDate(session.end) !== row.work_date && <small> · {dateLabel(tehranDate(session.end))}</small>}</span>
  </div>)}</div>
  {notes.map(note => <p className={a.sourceNote} key={note}>{note}</p>)}
 </div>;
}

export function AttendanceAdmin({ days, requests, people, asOf, filters, pendingCount, hasMoreDays, hasMoreRequests }: {
 asOf: string; days: StoredWorkDay[]; requests: TimeRequest[]; people: { user_id: string; name: string; department: string }[];
 filters: AttendanceFilters; pendingCount: number; hasMoreDays: boolean; hasMoreRequests: boolean;
}) {
 const [attendanceFilter, setAttendanceFilter] = useState('all');
 const [view, setView] = useState<'timeline' | 'table'>('timeline');
 const [section, setSection] = useState<'attendance' | 'requests'>('attendance');
 const router = useRouter(); const [refreshing, refresh] = useTransition();
 const person = (id: string) => people.find(entry => entry.user_id === id);
 const name = (id: string) => person(id)?.name || 'کاربر بدون پرونده';
 const summary = days.map(row => ({ row, ...adminDaySummary(row, asOf) }));
 const count = { all: days.length, open: summary.filter(day => day.open).length, late: summary.filter(day => day.lateMinutes > 0).length, mission: summary.filter(day => day.mission).length };
 const filtered = summary.filter(day => attendanceFilter === 'all' || (attendanceFilter === 'late' ? day.lateMinutes > 0 : attendanceFilter === 'mission' ? day.mission : day.open)).map(day => day.row);
 const groups = new Map<string, StoredWorkDay[]>();
 for (const row of filtered) groups.set(row.work_date, [...(groups.get(row.work_date) || []), row]);
 const today = tehranDate(asOf);
 const totalMinutes = summary.reduce((total, day) => total + (day.minutes ?? 0), 0);
 const statuses = [['all', 'همهٔ ترددها'], ['open', 'خروج ثبت‌نشده'], ['late', 'ورود بعد از ۸'], ['mission', 'مأموریت']] as const;
 return <div className={a.workspace}>
  <nav className={a.links}><Link href="/people">مدیریت کاربران و پرونده‌ها</Link><span>/</span><Link href="/attendance">حضور و غیاب من</Link></nav>
  <header className={a.heading}>
   <div><span className={a.eyebrow}>پنل مدیریت تیم</span><h1>حضور و غیاب، در یک نگاه</h1><p>مرور تردد همکاران و بررسی درخواست‌های ثبت و اصلاح ساعت</p></div>
   <button type="button" className={a.refresh} disabled={refreshing} onClick={() => refresh(() => router.refresh())}><RefreshCw size={16} className={refreshing ? a.spinning : ''} />{refreshing ? 'در حال دریافت…' : 'به‌روزرسانی'}<small>آخرین دریافت {clock(asOf)}</small></button>
  </header>
  <div className={a.stats}>
   <div className={a.stat}><span className={a.statIcon}><Users size={19} /></span><div><span>افراد این صفحه</span><strong>{new Set(days.map(day => day.user_id)).size.toLocaleString('fa-IR')} <small>نفر</small></strong></div></div>
   <div className={a.stat}><span className={a.statIcon}><Clock3 size={19} /></span><div><span>حضور محاسبه‌شدهٔ این صفحه</span><strong dir="ltr">{format(totalMinutes)}</strong><small>ساعت:دقیقه · بدون بازه‌های بازِ روزهای قبل</small></div></div>
   <button type="button" className={`${a.stat} ${a.attentionStat}`} onClick={() => { setSection('attendance'); setAttendanceFilter('open'); }}><span className={a.statIcon}><ListFilter size={19} /></span><div><span>خروج ثبت‌نشده در این صفحه</span><strong>{count.open.toLocaleString('fa-IR')} <small>روز</small></strong></div></button>
   <button type="button" className={`${a.stat} ${a.inboxStat}`} onClick={() => { setSection('requests'); if (filters.status !== 'pending' || filters.query || filters.dateInput || filters.requestsPage > 1) router.push(attendanceAdminHref(filters, { status: 'pending', query: '', dateInput: '', requestsPage: 1 })); }}><span className={a.statIcon}><Inbox size={19} /></span><div><span>در انتظار بررسی · همهٔ کاربران</span><strong>{pendingCount.toLocaleString('fa-IR')} <small>درخواست</small></strong></div><ArrowLeft size={16} /></button>
  </div>
  <div className={a.panel}>
   <div className={a.sections} role="group" aria-label="بخش مدیریت حضور و غیاب"><button type="button" aria-pressed={section === 'attendance'} onClick={() => setSection('attendance')}><ChartNoAxesGantt size={18} />تردد همکاران</button><button type="button" aria-pressed={section === 'requests'} onClick={() => setSection('requests')}><Inbox size={18} />بررسی درخواست‌ها<span>{pendingCount.toLocaleString('fa-IR')}</span></button></div>
   <Form action="/admin/attendance" scroll={false} key={attendanceAdminHref(filters)} className={a.filters}>
    <label className={a.searchField}><span>نام یا واحد</span><div><Search size={16} /><input name="q" defaultValue={filters.query} maxLength={150} placeholder="جست‌وجوی همکار یا واحد…" /></div></label>
    <label><span>تاریخ شمسی</span><div><CalendarDays size={16} /><input name="date" defaultValue={filters.dateInput} placeholder="همهٔ روزها · ۱۴۰۵/۰۷/۲۱" /></div></label>
    {section === 'requests' ? <label><span>وضعیت درخواست</span><Select name="status" aria-label="وضعیت درخواست" defaultValue={filters.status}><option value="pending">در انتظار</option><option value="approved">تأیید شده</option><option value="rejected">رد شده</option><option value="all">همه</option></Select></label> : <input type="hidden" name="status" value={filters.status} />}
    <button type="submit" className={a.apply}>نمایش</button>
    <Link className={a.today} scroll={false} href={attendanceAdminHref(filters, { dateInput: toPersianDate(today), daysPage: 1, requestsPage: 1 })}>امروز</Link>
    {(filters.query || filters.dateInput || filters.status !== 'pending') && <Link className={a.clear} scroll={false} href="/admin/attendance">حذف فیلترها</Link>}
   </Form>
   {section === 'attendance' ? <section aria-label="تردد همکاران">
    <div className={a.toolbar}>
     <div className={a.chips} role="group" aria-label="وضعیت تردد در این صفحه">{statuses.map(([value, label]) => <button type="button" key={value} aria-pressed={attendanceFilter === value} onClick={() => setAttendanceFilter(value)}>{label}<span>{count[value].toLocaleString('fa-IR')}</span></button>)}</div>
     <div className={a.views} role="group" aria-label="شیوهٔ نمایش"><button type="button" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}><ChartNoAxesGantt size={16} />بصری</button><button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}><Table2 size={16} />جدول</button></div>
    </div>
    <div className={a.legend}><span><i className={a.office} />حضور عادی</span><span><i className={a.remote} />دورکاری</span><span><i className={a.mission} />مأموریت</span><small>ساعت‌ها به وقت تهران · آمار و وضعیت‌ها مربوط به همین صفحه‌اند</small></div>
    {filtered.length === 0 ? <div className={a.empty}><CalendarDays size={32} /><h2>ترددی برای نمایش نیست</h2><p>{attendanceFilter !== 'all' ? 'در این صفحه موردی با وضعیت انتخاب‌شده وجود ندارد.' : 'برای این نام یا تاریخ، ترددی ثبت نشده است.'}</p>{attendanceFilter !== 'all' && <button type="button" onClick={() => setAttendanceFilter('all')}>نمایش همهٔ ترددهای این صفحه</button>}</div> : view === 'timeline' ? <div className={a.dayGroups}>{Array.from(groups, ([date, rows]) => <section className={a.dayGroup} key={date}>
     <header className={a.dayHeader}><h2><CalendarDays size={16} />{new Date(`${date}T12:00:00+03:30`).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran', weekday: 'long' })}<span>{dateLabel(date)}</span>{date === today && <em>امروز</em>}</h2><span>{rows.length.toLocaleString('fa-IR')} نفر در این صفحه</span></header>
     <div className={a.axisRow} aria-hidden="true"><span>همکار / وضعیت</span><div className={a.axis}>{[0, 4, 8, 12, 16, 20, 24].map(hour => <span key={hour} style={{ left: `${hour / 24 * 100}%` }}>{hour.toLocaleString('fa-IR', { minimumIntegerDigits: 2 })}</span>)}</div><span>ورود / خروج</span><span>مدت حضور</span><span /></div>
     {rows.map(row => {
      const day = adminDaySummary(row, asOf); const fullName = name(row.user_id);
      return <details className={a.personRow} key={row.user_id + row.work_date}>
       <summary className={a.rowSummary}>
        <div className={a.person}><span className={a.avatar}>{fullName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span><div><strong>{fullName}</strong>{person(row.user_id)?.department && <small>{person(row.user_id)?.department}</small>}<DayStatus row={row} asOf={asOf} /></div></div>
        <div className={a.chartCell}><DayTimeline row={row} asOf={asOf} /><span className={a.mobileAxis} aria-hidden="true"><span>۰۰</span><span>۱۲</span><span>۲۴</span></span></div>
        <div className={a.times}><span><small>ورود</small><b>{day.start ? clock(day.start) : '—'}</b></span><span><small>خروج</small><b>{day.end ? clock(day.end) : '—'}{day.end && tehranDate(day.end) !== row.work_date && <small>روز بعد</small>}</b></span></div>
        <div className={a.duration}><strong dir="ltr">{day.minutes === null ? '—' : format(day.minutes)}</strong><small>{day.historicalOpen ? 'نیاز به ثبت خروج' : day.open ? 'تا آخرین دریافت' : 'ساعت:دقیقه'}</small></div>
        <ChevronDown className={a.expand} size={17} /><span className={a.srOnly}>جزئیات تردد {fullName} در {dateLabel(date)}</span>
       </summary><DayDetail row={row} />
      </details>;
     })}
    </section>)}</div> : <div className={a.tableWrap}><table className={a.table}><caption className={a.srOnly}>حضور و غیاب همکاران در صفحهٔ جاری</caption><thead><tr><th>همکار</th><th>تاریخ</th><th>ورود</th><th>خروج</th><th>مدت حضور</th><th>وضعیت / جزئیات</th></tr></thead><tbody>{filtered.map(row => {
     const day = adminDaySummary(row, asOf); return <tr key={row.user_id + row.work_date}><th scope="row">{name(row.user_id)}<small>{person(row.user_id)?.department}</small></th><td>{dateLabel(row.work_date)}</td><td>{day.start ? clock(day.start) : '—'}</td><td>{day.end ? <>{clock(day.end)}{tehranDate(day.end) !== row.work_date && <small>{dateLabel(tehranDate(day.end))}</small>}</> : 'ثبت نشده'}</td><td dir="ltr">{day.minutes === null ? '—' : format(day.minutes)}</td><td><DayStatus row={row} asOf={asOf} /><details className={a.tableDetails}><summary>بازه‌ها و توضیحات</summary><DayDetail row={row} /></details></td></tr>;
    })}</tbody></table></div>}
    <Pagination filters={filters} kind="daysPage" hasMore={hasMoreDays} />
    <p className={a.footnote}>ورود بعد از ساعت ۸ صرفاً برای بررسی مشخص شده است؛ کارکرد شناور و تأیید توضیح تأخیر، ساعت ورود ثبت‌شده را تغییر نمی‌دهند.</p>
   </section> : <section className={a.requests} aria-label="بررسی درخواست‌ها"><header><h2>درخواست‌های ثبت و اصلاح تردد</h2><p>پیش از تأیید، ساعت پیشنهادی و توضیح همکار را بررسی کنید.</p></header><div className={s.requestList}>{requests.map(request => <ReviewRequest key={request.id} request={request} name={name(request.user_id)} />)}{!requests.length && <div className={a.empty}><Inbox size={32} /><h2>درخواستی با این فیلترها وجود ندارد</h2><p>درخواست‌های تأییدشده و ردشده از فیلتر وضعیت قابل مشاهده‌اند.</p></div>}</div><Pagination filters={filters} kind="requestsPage" hasMore={hasMoreRequests} /></section>}
  </div>
 </div>;
}
