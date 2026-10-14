import { getAccount } from '@/lib/account/data';
import { AttendanceWorkspace } from '@/components/attendance/AttendanceWorkspace';
import { getWorkData } from '@/lib/attendance/data';
import { attendanceHistory, type AttendanceHistorySearch } from '@/domain/attendance/history';
import Link from '@/components/navigation/AppLink';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'حضور و غیاب | پورتال زیلبر' };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<AttendanceHistorySearch> }) {
  const initialTime = new Date().toISOString();
  let history;
  try { history = attendanceHistory(await searchParams, initialTime); }
  catch { return <section><p role="alert">ماه انتخاب‌شده معتبر نیست.</p><Link href="/attendance">بازگشت به ماه جاری</Link></section>; }
  const [{ user, employee }, data] = await Promise.all([getAccount(), getWorkData(history)]);
  return <AttendanceWorkspace {...data} history={history} initialTime={initialTime} name={employee?.full_name || String(user.user_metadata.full_name || 'همکار زیلبر')} />;
}
