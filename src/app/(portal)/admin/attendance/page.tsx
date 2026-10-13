import { getAccessRole } from '@/lib/auth/session';
import { getAdminAttendanceData } from '@/lib/attendance/admin-data';
import { attendanceFilters, type AttendanceSearchParams } from '@/domain/attendance/queries';
import Link from '@/components/navigation/AppLink';
import { AttendanceAdmin } from '@/components/attendance/AttendanceAdmin';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'مدیریت حضور و غیاب | زیلبر' };
export default async function AttendanceAdminPage({ searchParams }: { searchParams: Promise<AttendanceSearchParams> }) {
 if (await getAccessRole() !== 'super_admin') return <p role="alert">شما به پنل مدیریت دسترسی ندارید.</p>;
 let filters;
 try { filters = attendanceFilters(await searchParams); }
 catch { return <section><p role="alert">تاریخ شمسی واردشده معتبر نیست.</p><Link href="/admin/attendance">پاک کردن فیلترها</Link></section>; }
 const data = await getAdminAttendanceData(filters);
 return <AttendanceAdmin {...data} filters={filters} asOf={new Date().toISOString()} />;
}
