import { requireSession } from '@/lib/auth/session';
import { AttendanceWorkspace } from '@/components/attendance/AttendanceWorkspace';
import { getRegistrationData } from '@/lib/attendance/data';
import { attendanceHistory, type AttendanceHistorySearch } from '@/domain/attendance/history';
import Link from '@/components/navigation/AppLink';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'حضور و غیاب | پورتال زیلبر' };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<AttendanceHistorySearch> }) {
  const initialTime = new Date().toISOString();
  const search = await searchParams;
  let history;
  try { history = attendanceHistory(search, initialTime); }
  catch { return <section><p role="alert">ماه انتخاب‌شده معتبر نیست.</p><Link href="/attendance">بازگشت به ماه جاری</Link></section>; }
  const [{ user }, data] = await Promise.all([requireSession(), getRegistrationData(initialTime)]);
  return <AttendanceWorkspace {...data} showHistory={typeof search.month === "string"} history={history} initialTime={initialTime} name={String(user.user_metadata.full_name || 'همکار زیلبر')} />;
}
