import React from 'react';
import { Header } from '@/components/layout/Header';
import { getSessionUser } from '@/actions/attendance';
import { getAdminDashboardData } from '@/actions/admin';
import { ApprovalInbox } from '@/components/admin/ApprovalInbox';
import { ShieldCheck, Users, CheckCircle2, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect('/login');
  }
  if (session.isSuperAdmin) redirect('/people');

  if (!session.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
        <Header profile={session.profile} isSuperAdmin={session.isSuperAdmin} avatar={session.avatar} gender={session.gender} />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">دسترسی غیرمجاز</h1>
          <p className="text-sm text-slate-500 mt-2">
            این بخش مختص مدیران و کارشناسان منابع انسانی زیلبر است.
          </p>
        </main>
      </div>
    );
  }

  const data = await getAdminDashboardData();
  const todayLogs = data?.todayLogs || [];
  const pendingLeaves = data?.pendingLeaves || [];
  const pendingMissions = data?.pendingMissions || [];
  const allProfiles = data?.allProfiles || [];

  const presentCount = todayLogs.filter((l) => !l.clock_out).length;
  const finishedCount = todayLogs.filter((l) => l.clock_out).length;
  const lateCount = todayLogs.filter((l) => l.status === 'late').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <Header profile={session.profile} isSuperAdmin={session.isSuperAdmin} avatar={session.avatar} gender={session.gender} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                کارتابل و مانیتورینگ منابع انسانی
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              نظارت بر ترددهای روزانه پرسنل و تایید یا رد درخواست‌های سازمانی
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">کل پرسنل فعال</span>
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {allProfiles.length}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">حاضرین در شرکت هم‌اکنون</span>
              <span className="text-2xl font-bold font-mono text-emerald-600">
                {presentCount} <span className="text-xs font-normal text-slate-500">نفر</span>
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">تاخیرهای امروز</span>
              <span className="text-2xl font-bold font-mono text-amber-600">
                {lateCount} <span className="text-xs font-normal text-slate-500">مورد</span>
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">درخواست‌های در انتظار</span>
              <span className="text-2xl font-bold font-mono text-purple-600">
                {pendingLeaves.filter((l) => l.status === 'pending').length +
                  pendingMissions.filter((m) => m.status === 'pending').length}
              </span>
            </div>
          </div>
        </div>

        {/* Live Attendance Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                مانیتورینگ زنده تردد امروز پرسنل
              </h2>
            </div>
            <span className="text-xs text-slate-400">{todayLogs.length} ثبت شده</span>
          </div>

          {todayLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              امروز هنوز ترددی توسط پرسنل ثبت نشده است.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4">نام پرسنل</th>
                    <th className="py-3 px-4">کد پرسنلی</th>
                    <th className="py-3 px-4">دپارتمان</th>
                    <th className="py-3 px-4">زمان ورود</th>
                    <th className="py-3 px-4">زمان خروج</th>
                    <th className="py-3 px-4">محل کار</th>
                    <th className="py-3 px-4">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {todayLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {log.profile?.full_name || 'کارمند زیلبر'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">{log.profile?.employee_code || '-'}</td>
                      <td className="py-3.5 px-4 text-xs">{log.profile?.department || '-'}</td>
                      <td className="py-3.5 px-4 font-mono font-medium text-blue-600">
                        {new Date(log.clock_in).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {log.clock_out
                          ? new Date(log.clock_out).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                          : 'در حال کار'}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {log.location_type === 'remote' ? 'دورکاری' : 'دفتر زیلبر'}
                      </td>
                      <td className="py-3.5 px-4">
                        {log.clock_out ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
                            خروج ثبت شده
                          </span>
                        ) : log.status === 'late' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                            تاخیر ({log.late_minutes} دقیقه)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                            حاضر
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Approval Inbox */}
        <ApprovalInbox leaves={pendingLeaves} missions={pendingMissions} />
      </main>
    </div>
  );
}
