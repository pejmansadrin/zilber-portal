import React from 'react';
import { Header } from '@/components/layout/Header';
import { ClockInOutWidget } from '@/components/attendance/ClockInOutWidget';
import { AttendanceHistoryTable } from '@/components/attendance/AttendanceHistoryTable';
import { DashboardActions } from '@/components/attendance/DashboardActions';
import { getSessionUser, getTodayAttendance, getAttendanceHistory } from '@/actions/attendance';
import { Clock, CheckCircle2, TrendingUp, CalendarDays, Award } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const session = await getSessionUser();

  // If not logged in or profile not found, redirect to login
  if (!session) redirect('/login');
  if (!session.profile) redirect('/dashboard');

  const profile = session.profile;
  const todayLog = await getTodayAttendance();
  const historyLogs = await getAttendanceHistory(20);

  // Calculate monthly stats
  const totalWorkMinutes = historyLogs.reduce((acc, curr) => acc + (curr.work_duration_minutes || 0), 0);
  const totalOvertimeMinutes = historyLogs.reduce((acc, curr) => acc + (curr.overtime_minutes || 0), 0);
  const totalLates = historyLogs.filter((l) => l.status === 'late').length;

  const totalHours = Math.floor(totalWorkMinutes / 60);
  const overtimeHours = Math.floor(totalOvertimeMinutes / 60);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <Header profile={profile} isSuperAdmin={session.isSuperAdmin} avatar={session.avatar} gender={session.gender} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-l from-[#16214f] to-[#1e2e6d] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-surface [--glass-tint:rgb(255_255_255_/_12%)] [--glass-shadow:none] text-blue-200 text-xs font-semibold  mb-3">
                <Award className="w-3.5 h-3.5 text-blue-300" />
                <span>پورتال اختصاصی زیلبر</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                سلام، {profile.full_name} عزیز 👋
              </h1>
              <p className="mt-2 text-blue-100/80 text-sm max-w-xl">
                امروز را پرانرژی شروع کنید! وضعیت تردد خود را در این سامانه ثبت و مدیریت نمایید.
              </p>
            </div>

            <DashboardActions />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">کارکرد ماه جاری</span>
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {totalHours} <span className="text-xs font-normal text-slate-500">ساعت</span>
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">اضافه کاری ماه</span>
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {overtimeHours} <span className="text-xs font-normal text-slate-500">ساعت</span>
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">روزهای حضور</span>
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {historyLogs.length} <span className="text-xs font-normal text-slate-500">روز</span>
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">مانده مرخصی</span>
              <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                ۲.۵ <span className="text-xs font-normal text-slate-500">روز</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Clock-in widget */}
        <ClockInOutWidget initialLog={todayLog} />

        {/* Recent Attendance Logs Table */}
        <AttendanceHistoryTable logs={historyLogs} />
      </main>
    </div>
  );
}
