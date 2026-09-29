'use client';

import React from 'react';
import { AttendanceLog } from '@/types/attendance';
import { Calendar, Clock, AlertCircle, CheckCircle2, Laptop } from 'lucide-react';

interface AttendanceHistoryTableProps {
  logs: AttendanceLog[];
}

export function AttendanceHistoryTable({ logs }: AttendanceHistoryTableProps) {
  const formatPersianDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fa-IR', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeString = (isoStr?: string | null) => {
    if (!isoStr) return '--:--';
    return new Date(isoStr).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} دقیقه`;
    return `${h} ساعت و ${m} دقیقه`;
  };

  const getStatusBadge = (status: string, locationType: string) => {
    if (locationType === 'remote') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Laptop className="w-3 h-3" />
          دورکاری
        </span>
      );
    }

    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            حاضر
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3 h-3" />
            با تاخیر
          </span>
        );
      case 'early_leave':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            تعجیل خروج
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-[#16214f] dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">سوابق تردد اخیر</h2>
        </div>
        <span className="text-xs text-slate-500">{logs.length} رکورد ثبت‌شده</span>
      </div>

      {logs.length === 0 ? (
        <div className="p-12 text-center text-slate-400 dark:text-slate-500">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">هنوز رکوردی برای تردد ثبت نشده است.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs font-semibold">
              <tr>
                <th className="py-3.5 px-6">تاریخ</th>
                <th className="py-3.5 px-6">ورود</th>
                <th className="py-3.5 px-6">خروج</th>
                <th className="py-3.5 px-6">مدت کارکرد</th>
                <th className="py-3.5 px-6">وضعیت</th>
                <th className="py-3.5 px-6">توضیحات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 font-medium text-slate-900 dark:text-slate-100">
                    {formatPersianDate(log.work_date)}
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-800 dark:text-slate-200">
                    {formatTimeString(log.clock_in)}
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-800 dark:text-slate-200">
                    {formatTimeString(log.clock_out)}
                  </td>
                  <td className="py-4 px-6 font-mono">
                    {log.work_duration_minutes > 0 ? formatMinutes(log.work_duration_minutes) : '--'}
                  </td>
                  <td className="py-4 px-6">{getStatusBadge(log.status, log.location_type)}</td>
                  <td className="py-4 px-6 text-xs text-slate-500 max-w-xs truncate">
                    {log.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
