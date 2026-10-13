'use client';

import { Select } from "@/components/ui/Select";
import { toPersianDate } from '@/lib/persian-date';
import { useState } from 'react';
import s from './AttendanceWorkspace.module.css';
import { format } from './timesheet-data';
import { sessionMinutes, type WorkDay } from '@/domain/attendance/work-sessions';
import { AttendanceGantt } from './AttendanceGantt';
const time = (stamp: string) => new Date(stamp).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' });
export function TimesheetPreview({ name, currentTime, todayEntry, workDays }: { name: string; currentTime: string; todayEntry: WorkDay | null; workDays: WorkDay[] }) {
 const [filter, setFilter] = useState('all');
 const visible = workDays.filter(day => filter === 'all' || (filter === 'incomplete' ? !day.end : !!day.end));
 return <section className={`${s.card} ${s.timesheet}`} aria-labelledby="timesheet-heading">
  <div className={s.sheetHeading}><h2 id="timesheet-heading">تایم‌شیت ورود و خروج</h2></div>
  <div className={s.sheetToolbar}><label className={s.filter}>وضعیت<Select aria-label="وضعیت سوابق" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">همهٔ سوابق</option><option value="complete">تردد کامل</option><option value="incomplete">خروج ثبت‌نشده</option></Select></label></div>
  <AttendanceGantt person={name} currentTime={currentTime} todayEntry={todayEntry} workDays={workDays} />
  <div className={s.sheetTableWrap}><table className={s.sheetTable}><caption className={s.sheetCaption}>سوابق حضور و غیاب {name}</caption><thead><tr><th>تاریخ</th><th>ورود</th><th>خروج</th><th>مدت حضور</th><th>وضعیت</th></tr></thead><tbody>
   {visible.map(day => <tr key={day.date}><th>{toPersianDate(day.date)}</th><td>{time(day.start)}</td><td>{day.end ? time(day.end) : '—'}</td><td>{format(sessionMinutes(day.sessions, day.end ? undefined : currentTime))}</td><td>{day.end ? 'کامل' : 'خروج ثبت‌نشده'}</td></tr>)}
   {!visible.length && <tr><td colSpan={5}>هنوز ترددی ثبت نشده است.</td></tr>}
  </tbody></table></div>
  <p className={s.sheetFooter}>کارکرد از مجموع بازه‌های ثبت‌شده محاسبه می‌شود؛ درخواست در انتظار تأیید در آن محاسبه نمی‌شود.</p>
 </section>;
}
