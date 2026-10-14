'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { AttendanceHistory } from '@/domain/attendance/history';
import type { WorkDay } from '@/domain/attendance/work-sessions';
import s from './AttendanceWorkspace.module.css';

const AttendanceMonthPanel = dynamic(() => import('./AttendanceMonthPanel'), { loading: () => <p role="status">در حال آماده‌سازی سوابق…</p> });
const AttendanceRequestsPanel = dynamic(() => import('./AttendanceRequestsPanel'), { loading: () => <p role="status">در حال آماده‌سازی مکاتبات…</p> });

export function AttendanceContent(props: { name: string; currentTime: string; todayEntry: WorkDay | null; history: AttendanceHistory; revision: string; showHistory?: boolean }) {
  const [monthOpen, setMonthOpen] = useState(props.showHistory ?? false);
  const [requestsOpen, setRequestsOpen] = useState(props.history.requestsPage > 1);
  return <>
    <section className={s.card} aria-label="مکاتبات حضور و غیاب">
      <button type="button" className={s.contentToggle} aria-expanded={requestsOpen} aria-controls="attendance-requests" onClick={() => setRequestsOpen(value => !value)}>
        <span>تاریخچه مکاتبات</span><span>{requestsOpen ? 'بستن' : 'مشاهده درخواست‌ها'}</span>
      </button>
      {requestsOpen && <div id="attendance-requests"><AttendanceRequestsPanel history={props.history} revision={props.revision} /></div>}
    </section>
    <section className={s.card} aria-label="سوابق حضور و غیاب">
      <button type="button" className={s.contentToggle} aria-expanded={monthOpen} aria-controls="attendance-month" onClick={() => setMonthOpen(value => !value)}>
        <span>تایم‌شیت ورود و خروج</span><span>{monthOpen ? 'بستن' : 'مشاهده سوابق ماهانه'}</span>
      </button>
      {monthOpen && <div id="attendance-month"><AttendanceMonthPanel {...props} /></div>}
    </section>
  </>;
}
