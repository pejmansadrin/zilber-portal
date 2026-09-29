'use client';

import React, { useState, useEffect } from 'react';
import { AttendanceLog } from '@/types/attendance';
import { clockIn, clockOut } from '@/actions/attendance';
import { Clock, LogIn, LogOut, CheckCircle, AlertTriangle, Laptop, Building2, MapPin, Loader2 } from 'lucide-react';

interface ClockInOutWidgetProps {
  initialLog: AttendanceLog | null;
}

export function ClockInOutWidget({ initialLog }: ClockInOutWidgetProps) {
  const [log, setLog] = useState<AttendanceLog | null>(initialLog);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [locationType, setLocationType] = useState<'office' | 'remote' | 'field'>('office');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  // Live Clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('fa-IR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );

      if (log?.clock_in && !log?.clock_out) {
        const start = new Date(log.clock_in).getTime();
        const diffMins = Math.floor((now.getTime() - start) / (1000 * 60));
        setElapsedMinutes(Math.max(0, diffMins));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [log]);

  const handleClockIn = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await clockIn({ locationType, notes });
      if (res.success) {
        setMessage({ text: res.message || 'ورود ثبت شد', type: 'success' });
        // Refresh local state
        setLog({
          id: 'temp',
          user_id: '',
          work_date: new Date().toISOString().split('T')[0],
          clock_in: new Date().toISOString(),
          clock_out: null,
          status: locationType === 'remote' ? 'remote' : 'present',
          work_duration_minutes: 0,
          late_minutes: 0,
          early_leave_minutes: 0,
          overtime_minutes: 0,
          location_type: locationType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        setMessage({ text: res.error || 'خطا در ثبت ورود', type: 'error' });
      }
    } catch {
      setMessage({ text: 'خطای غیرمنتظره رخ داد', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await clockOut(notes);
      if (res.success) {
        setMessage({ text: res.message || 'خروج ثبت شد', type: 'success' });
        if (log) {
          setLog({
            ...log,
            clock_out: new Date().toISOString(),
            work_duration_minutes: elapsedMinutes,
          });
        }
      } else {
        setMessage({ text: res.error || 'خطا در ثبت خروج', type: 'error' });
      }
    } catch {
      setMessage({ text: 'خطای غیرمنتظره رخ داد', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatHoursAndMins = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours} ساعت و ${mins} دقیقه`;
  };

  const formatTimeString = (isoStr?: string | null) => {
    if (!isoStr) return '--:--';
    return new Date(isoStr).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-all">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
            <Clock className="w-4 h-4 text-[#16214f] dark:text-blue-400" />
            <span>{currentDate || 'در حال بارگذاری...'}</span>
          </div>
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#16214f] dark:text-white font-mono mt-1">
            {currentTime || '--:--:--'}
          </div>
        </div>

        {/* Current status indicator */}
        <div className="flex items-center gap-3">
          {log?.clock_out ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm">
              <CheckCircle className="w-4 h-4 text-slate-500" />
              <span>پایان شیفت کاری امروز</span>
            </div>
          ) : log?.clock_in ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold text-sm border border-emerald-200 dark:border-emerald-800 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>حاضر در کار ({log.location_type === 'remote' ? 'دورکاری' : 'حضوری'})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium text-sm border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>هنوز ورودی ثبت نشده است</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Action Section */}
      <div className="mt-6">
        {message && (
          <div
            className={`p-3.5 rounded-xl mb-5 text-sm font-medium flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {!log?.clock_in ? (
          /* Clock In State */
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                محل حضور:
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setLocationType('office')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                    locationType === 'office'
                      ? 'border-[#16214f] bg-blue-50/80 text-[#16214f] dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-[#16214f]/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>دفتر زیلبر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType('remote')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                    locationType === 'remote'
                      ? 'border-[#16214f] bg-blue-50/80 text-[#16214f] dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-[#16214f]/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Laptop className="w-4 h-4" />
                  <span>دورکاری</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType('field')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                    locationType === 'field'
                      ? 'border-[#16214f] bg-blue-50/80 text-[#16214f] dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-[#16214f]/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>مأموریت بیرون</span>
                </button>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="توضیحات اختیاری (مثلاً جلسه با کارفرما یا پروژه مربوطه)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#16214f] dark:focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleClockIn}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#16214f] hover:bg-[#0e1635] text-white font-bold text-base shadow-lg shadow-blue-950/15 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>ثبت ورود امروز</span>
                </>
              )}
            </button>
          </div>
        ) : !log?.clock_out ? (
          /* Clock Out State */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">زمان ورود ثبت‌شده:</span>
                <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
                  {formatTimeString(log.clock_in)}
                </span>
                {log.late_minutes > 0 && (
                  <span className="text-xs text-rose-500 font-medium mr-2">
                    ({log.late_minutes} دقیقه تاخیر)
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">مدت زمان کارکرد تاکنون:</span>
                <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {formatHoursAndMins(elapsedMinutes)}
                </span>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="توضیحات خروج (اختیاری)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <button
              onClick={handleClockOut}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base shadow-lg shadow-rose-600/15 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogOut className="w-5 h-5" />
                  <span>ثبت خروج و اتمام شیفت</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Both Clocked In & Out */
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-xs text-slate-500 block mb-1">زمان ورود</span>
                <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">
                  {formatTimeString(log.clock_in)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1">زمان خروج</span>
                <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">
                  {formatTimeString(log.clock_out)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1">کل ساعت کارکرد</span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatHoursAndMins(log.work_duration_minutes)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-1">اضافه‌کار / کسرکار</span>
                <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">
                  {log.overtime_minutes > 0
                    ? `+${log.overtime_minutes} دقیقه`
                    : log.early_leave_minutes > 0
                    ? `-${log.early_leave_minutes} دقیقه`
                    : 'مطابق برنامه'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
