import React from 'react';
import { Header } from '@/components/layout/Header';
import { MobileBack } from '@/components/navigation/MobileBack';
import { getSessionUser } from '@/actions/attendance';
import { createClient } from '@/lib/supabase/server';
import { DashboardActions } from '@/components/attendance/DashboardActions';
import { Calendar, Briefcase, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LeavesPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (!session.profile) redirect('/dashboard');

  const supabase = await createClient();

  const { data: leaves } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const { data: missions } = await supabase
    .from('mission_requests')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'daily_paid':
        return 'استحقاقی روزانه';
      case 'hourly':
        return 'ساعتی';
      case 'sick':
        return 'استعلاجی';
      case 'daily_unpaid':
        return 'بدون حقوق';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            تایید شده
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            رد شده
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-3.5 h-3.5" />
            در انتظار بررسی
          </span>
        );
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('fa-IR');
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <Header profile={session.profile} isSuperAdmin={session.isSuperAdmin} avatar={session.avatar} gender={session.gender} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8 sm:py-8 space-y-5 sm:space-y-8">
          <MobileBack />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              مدیریت مرخصی‌ها و مأموریت‌ها
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              مشاهده وضعیت درخواست‌های ثبت‌شده و پیگیری تاییدیه مدیریت
            </p>
          </div>

          <DashboardActions />
        </div>

        {/* Leaves Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-[#16214f] dark:text-blue-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              درخواست‌های مرخصی شما
            </h2>
            <span className="text-xs text-slate-400">({leaves?.length || 0} مورد)</span>
          </div>

          {!leaves || leaves.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              هیچ درخواست مرخصی ثبت‌نشده است.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4">نوع مرخصی</th>
                    <th className="py-3 px-4">تاریخ شروع</th>
                    <th className="py-3 px-4">تاریخ پایان</th>
                    <th className="py-3 px-4">مدت / ساعت</th>
                    <th className="py-3 px-4">علت درخواست</th>
                    <th className="py-3 px-4">وضعیت</th>
                    <th className="py-3 px-4">نظر مدیر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {getLeaveTypeLabel(l.type)}
                      </td>
                      <td className="py-3.5 px-4 font-mono">{formatDate(l.start_date)}</td>
                      <td className="py-3.5 px-4 font-mono">{formatDate(l.end_date)}</td>
                      <td className="py-3.5 px-4 font-mono">
                        {l.type === 'hourly' ? `${l.hours} ساعت` : 'روزانه'}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-xs">{l.reason}</td>
                      <td className="py-3.5 px-4">{getStatusBadge(l.status)}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{l.manager_note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Missions Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <Briefcase className="w-5 h-5 text-[#16214f] dark:text-blue-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              درخواست‌های مأموریت شما
            </h2>
            <span className="text-xs text-slate-400">({missions?.length || 0} مورد)</span>
          </div>

          {!missions || missions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              هیچ درخواست مأموریتی ثبت‌نشده است.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4">مقصد</th>
                    <th className="py-3 px-4">تاریخ شروع</th>
                    <th className="py-3 px-4">تاریخ پایان</th>
                    <th className="py-3 px-4">وسیله نقلیه</th>
                    <th className="py-3 px-4">شرح مأموریت</th>
                    <th className="py-3 px-4">وضعیت</th>
                    <th className="py-3 px-4">نظر مدیر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {missions.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {m.destination}
                      </td>
                      <td className="py-3.5 px-4 font-mono">{formatDate(m.start_date)}</td>
                      <td className="py-3.5 px-4 font-mono">{formatDate(m.end_date)}</td>
                      <td className="py-3.5 px-4 text-xs">{m.transport_type}</td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-xs">{m.purpose}</td>
                      <td className="py-3.5 px-4">{getStatusBadge(m.status)}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{m.manager_note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
