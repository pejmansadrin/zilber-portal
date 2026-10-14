'use client';
import { useState } from 'react';
import { attendanceHistory, type AttendanceHistory } from '@/domain/attendance/history';
import type { WorkDay } from '@/domain/attendance/work-sessions';
import { usePrivateResource } from '@/lib/use-private-resource';
import { TimesheetPreview } from './TimesheetPreview';

export default function AttendanceMonthPanel({ name, currentTime, todayEntry, history: initialHistory, revision }: {
  name: string; currentTime: string; todayEntry: WorkDay | null; history: AttendanceHistory; revision: string;
}) {
  const [history, setHistory] = useState(initialHistory);
  const { data, error, retry } = usePrivateResource<{ days: WorkDay[]; name: string }>(`/api/attendance/history?section=month&month=${encodeURIComponent(history.month)}`, revision);
  if (error) return <p role="alert">{error} <button type="button" onClick={retry}>تلاش دوباره</button></p>;
  if (!data) return <p role="status">در حال دریافت سوابق ماه…</p>;
  return <TimesheetPreview name={data.name || name} currentTime={currentTime} todayEntry={todayEntry} workDays={data.days} history={history}
    onMonthChange={month => setHistory(attendanceHistory({ month }, currentTime))} />;
}
