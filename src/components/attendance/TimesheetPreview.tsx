'use client';

import { Select } from "@/components/ui/Select";
import { toPersianDate } from '@/lib/persian-date';
import { memo, useMemo, useState } from 'react';
import s from './AttendanceWorkspace.module.css';
import { format } from './timesheet-data';
import { sessionMinutes, type WorkDay } from '@/domain/attendance/work-sessions';
import Link from '@/components/navigation/AppLink';
import type { AttendanceHistory } from '@/domain/attendance/history';
import { persianClock } from '@/lib/clock-format';
import dynamic from 'next/dynamic';
const AttendanceGantt = dynamic(() => import('./AttendanceGantt').then(module => module.AttendanceGantt), { loading: () => <p role="status">در حال آماده‌سازی نمودار…</p> });
const time = persianClock;
const HistoryRow = memo(function HistoryRow({ day, currentTime }: { day: WorkDay; currentTime?: string }) {
 return <tr><th>{toPersianDate(day.date)}</th><td>{time(day.start)}</td><td>{day.end ? time(day.end) : '—'}</td><td>{format(sessionMinutes(day.sessions, currentTime))}</td><td>{day.end ? 'کامل' : 'خروج ثبت‌نشده'}</td></tr>;
});
export function TimesheetPreview({ name, currentTime, todayEntry, workDays, history, onMonthChange }: { name: string; currentTime: string; todayEntry: WorkDay | null; workDays: WorkDay[]; history: AttendanceHistory; onMonthChange?: (month: string) => void }) {
 const [chartOpen, setChartOpen] = useState(false);
 const [filter, setFilter] = useState('all');
 const visible = useMemo(() => workDays.filter(day => day.date >= history.first && day.date < history.until && (filter === 'all' || (filter === 'incomplete' ? !day.end : !!day.end))), [workDays, filter, history.first, history.until]);
 return <section className={`${s.card} ${s.timesheet}`} aria-labelledby="timesheet-heading">
  <div className={s.sheetHeading}><h2 id="timesheet-heading">تایم‌شیت ورود و خروج</h2></div>
  <nav className={s.historyNavigation} aria-label="انتخاب ماه سوابق">
   {history.previousMonth && (onMonthChange ? <button type="button" onClick={() => onMonthChange(history.previousMonth!)}>ماه قبل</button> : <Link prefetch={false} href={`/attendance?month=${encodeURIComponent(history.previousMonth)}`}>ماه قبل</Link>)}
   <strong dir="ltr">{history.month.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])}</strong>
   {history.nextMonth && (onMonthChange ? <button type="button" onClick={() => onMonthChange(history.nextMonth!)}>ماه بعد</button> : <Link prefetch={false} href={`/attendance?month=${encodeURIComponent(history.nextMonth)}`}>ماه بعد</Link>)}
  </nav>
  <div className={s.sheetToolbar}><label className={s.filter}>وضعیت<Select aria-label="وضعیت سوابق" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">همهٔ سوابق</option><option value="complete">تردد کامل</option><option value="incomplete">خروج ثبت‌نشده</option></Select></label></div>
  <button type="button" className={s.contentToggle} aria-expanded={chartOpen} onClick={() => setChartOpen(value => !value)}>{chartOpen ? "بستن نمودار" : "نمایش نمودار کارکرد"}</button>
  {chartOpen && <AttendanceGantt key={history.month} month={history.month} person={name} currentTime={currentTime} todayEntry={todayEntry} workDays={workDays} />}
  <div className={s.sheetTableWrap}><table className={s.sheetTable}><caption className={s.sheetCaption}>سوابق حضور و غیاب {name}</caption><thead><tr><th>تاریخ</th><th>ورود</th><th>خروج</th><th>مدت حضور</th><th>وضعیت</th></tr></thead><tbody>
   {visible.map(day => <HistoryRow key={day.date} day={day} currentTime={day.end ? undefined : currentTime} />)}
   {!visible.length && <tr><td colSpan={5}>هنوز ترددی ثبت نشده است.</td></tr>}
  </tbody></table></div>
  <p className={s.sheetFooter}>کارکرد از مجموع بازه‌های ثبت‌شده محاسبه می‌شود؛ درخواست در انتظار تأیید در آن محاسبه نمی‌شود.</p>
 </section>;
}
