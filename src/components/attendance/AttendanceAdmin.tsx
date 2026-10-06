'use client';

import { Select } from "@/components/ui/Select";
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reviewWork } from '@/actions/attendance-review';
import { fromPersianDate, toPersianDate } from '@/lib/persian-date';
import { requestStatus, storedWorkDay, type StoredWorkDay, type TimeRequest } from '@/types/attendance-review';
import { sessionMinutes, modeLabel } from './work-sessions';
import { format } from './timesheet-data';
import { matchesDirectorySearch } from '@/lib/directory-search';
import s from './AttendanceWorkspace.module.css';
const clock = (stamp: string) => new Date(stamp).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });
function ReviewRequest({ request, name }: { request: TimeRequest; name: string }) {
 const [note, setNote] = useState(''); const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
 const [busy, startTransition] = useTransition();
 const original = request.session_index === null ? null : request.original_sessions[request.session_index];
 const oldTime = original && (request.action === 'start' ? original.start : original.end);
 function review(decision: 'approved' | 'rejected') {
  startTransition(async () => { try { setFeedback(await reviewWork(request.id, decision, note)); } catch { setFeedback({ ok: false, message: 'بررسی انجام نشد؛ دوباره تلاش کنید.' }); } });
 }
 return <article className={s.requestItem}>
  <div><strong>{name} · {request.kind === 'late' ? 'توضیح تأخیر' : request.requested_until ? request.mode === 'mission' ? 'ثبت مأموریت' : 'ثبت ورود و خروج' : 'ثبت یا اصلاح ساعت'}</strong><span>{toPersianDate(request.work_date)} · {requestStatus[request.status]}</span></div>
  {request.kind === 'time' && <p>{request.action === 'start' ? 'ورود' : 'خروج'} {request.mode ? modeLabel(request.mode) : ''} · {request.session_index === null ? 'ثبت جاافتاده' : `ساعت قبلی: ${oldTime ? clock(oldTime) : 'ثبت نشده'}`} ← ساعت درخواستی: {request.requested_at ? `${toPersianDate(new Date(request.requested_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' }))}، ${clock(request.requested_at)}` : '—'}</p>}
  {request.requested_until && <p>پایان بازهٔ درخواستی: {toPersianDate(new Date(request.requested_until).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' }))}، {clock(request.requested_until)}</p>}
  <p>{request.reason}</p>
  {request.status === 'pending' ? <><label>یادداشت بررسی<textarea className={s.reviewNote} rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={2000} /></label><div className={s.reviewButtons}><button disabled={busy} onClick={() => review('approved')}>تأیید {request.kind === 'time' ? 'و اعمال ساعت' : 'توضیح'}</button><button disabled={busy} onClick={() => review('rejected')}>رد درخواست</button></div></> : <p>{request.review_note || 'بدون یادداشت'}{request.reviewed_at && ` · بررسی در ${new Date(request.reviewed_at).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}`}</p>}
  {feedback && <p role={feedback.ok ? 'status' : 'alert'}>{feedback.message}</p>}
 </article>;
}
export function AttendanceAdmin({ days, requests, people, asOf }: { asOf: string; days: StoredWorkDay[]; requests: TimeRequest[]; people: { user_id: string; name: string; department: string }[] }) {
 const [search, setSearch] = useState(''); const [date, setDate] = useState(''); const [status, setStatus] = useState('pending'); const [attendanceFilter, setAttendanceFilter] = useState('all');
 const router = useRouter(); const [refreshing, refresh] = useTransition();
 const name = (id: string) => people.find(person => person.user_id === id)?.name || 'کاربر بدون پرونده';
 const matches = (id: string, workDate: string) => matchesDirectorySearch([name(id), people.find(person => person.user_id === id)?.department], search) && (!date || workDate === fromPersianDate(date));
 const late = (day: StoredWorkDay) => Math.max(0, Math.floor((Date.parse(storedWorkDay(day).start) - Date.parse(`${day.work_date}T08:00:00+03:30`)) / 60000));
 const filtered = days.filter(day => matches(day.user_id, day.work_date) && (attendanceFilter === 'all' || (attendanceFilter === 'late' ? late(day) > 0 : !storedWorkDay(day).end)));
 const visibleRequests = requests.filter(request => matches(request.user_id, request.work_date) && (status === 'all' || request.status === status));
 return <div className={s.workspace}>
  <nav className={s.adminTabs}><Link href="/people">مدیریت کاربران و پرونده‌ها</Link><Link href="/attendance">حضور و غیاب من</Link></nav>
  <header className={s.heading}><h1>مدیریت حضور و غیاب</h1><span className={s.badge}>{requests.filter(request => request.status === 'pending').length.toLocaleString('fa-IR')} درخواست در انتظار</span></header>
  <section className={s.card}>
   <h2>تردد همهٔ کاربران</h2>
   <div className={s.adminToolbar}><label>نام یا واحد<input value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی کاربر" /></label><label>تاریخ شمسی<input value={date} onChange={e => setDate(e.target.value)} placeholder="همهٔ تاریخ‌ها · ۱۴۰۵/۰۷/۱۲" /></label><label>وضعیت تردد<Select aria-label="وضعیت تردد" value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value)}><option value="all">همه</option><option value="late">ورود بعد از ۸</option><option value="open">خروج ثبت‌نشده</option></Select></label><button className={s.exitAction} disabled={refreshing} onClick={() => refresh(() => router.refresh())}>به‌روزرسانی</button></div>
   {date && !fromPersianDate(date) && <p role="alert" className={s.entryError}>تاریخ شمسی معتبر وارد کنید.</p>}
   <p className={s.registrationHint}>ساعت‌ها به وقت تهران؛ ورود بعد از ساعت ۸ برای بررسی نمایش داده می‌شود. کارکرد شناور از مجموع بازه‌ها محاسبه می‌شود و تأیید توضیح تأخیر، ساعت ورود را تغییر نمی‌دهد.</p>
   <div className={s.sheetTableWrap}><table className={s.sheetTable}><caption className={s.sheetCaption}>حضور و غیاب همه کاربران</caption><thead><tr><th>کاربر</th><th>تاریخ</th><th>ورود</th><th>خروج</th><th>مدت حضور</th><th>بازه‌ها</th></tr></thead><tbody>{filtered.map(row => {
    const day = storedWorkDay(row); return <tr key={row.user_id + row.work_date}><th>{name(row.user_id)}</th><td>{toPersianDate(row.work_date)}</td><td>{clock(day.start)}</td><td>{day.end ? clock(day.end) : 'ثبت نشده'}</td><td>{format(sessionMinutes(day.sessions, asOf))}</td><td>{day.sessions.map((session, index) => <div key={index}>{modeLabel(session.mode)} · {clock(session.start)} تا {session.end ? clock(session.end) : 'باز'}</div>)}</td></tr>;
   })}{!filtered.length && <tr><td colSpan={6}>ترددی برای این فیلتر ثبت نشده است.</td></tr>}</tbody></table></div>
  </section>
  <section className={s.card}><h2>بررسی درخواست‌های تأخیر و اصلاح ساعت</h2><div className={s.adminToolbar}><label>وضعیت درخواست<Select aria-label="وضعیت درخواست" value={status} onChange={e => setStatus(e.target.value)}><option value="pending">در انتظار</option><option value="approved">تأیید شده</option><option value="rejected">رد شده</option><option value="all">همه</option></Select></label></div><div className={s.requestList}>{visibleRequests.map(request => <ReviewRequest key={request.id} request={request} name={name(request.user_id)} />)}{!visibleRequests.length && <p className={s.empty}>درخواستی برای بررسی وجود ندارد.</p>}</div></section>
 </div>;
}
