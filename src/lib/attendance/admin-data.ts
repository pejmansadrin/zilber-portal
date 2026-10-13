import 'server-only';
import { requireSuperAdmin } from '@/lib/auth/session';
import { matchesDirectorySearch } from '@/lib/directory-search';
import { attendancePageSize, type AttendanceFilters } from '@/domain/attendance/queries';

export async function getAdminAttendanceData(filters: AttendanceFilters) {
  const { client } = await requireSuperAdmin();
  const peoplePromise = client.rpc('organization_directory', {}).then(({ data, error }) => {
    if (error) throw new Error('دریافت کاربران انجام نشد.');
    return (data || []).filter(person => person.auth_user_id).map(person => ({
      user_id: String(person.auth_user_id), name: String(person.full_name || 'کاربر بدون پرونده'),
      department: String(person.department || ''),
    }));
  });
  const matchingIds = filters.query ? (await peoplePromise)
    .filter(person => matchesDirectorySearch([person.name, person.department], filters.query))
    .map(person => person.user_id) : null;
  let days = client.from('portal_work_days').select('user_id,work_date,sessions,revision,updated_at');
  let requests = client.from('portal_time_requests').select('*');
  if (matchingIds) {
    days = days.in('user_id', matchingIds);
    requests = requests.in('user_id', matchingIds);
  }
  if (filters.date) {
    days = days.eq('work_date', filters.date);
    requests = requests.eq('work_date', filters.date);
  }
  if (filters.status !== 'all') requests = requests.eq('status', filters.status);
  const daysOffset = (filters.daysPage - 1) * attendancePageSize;
  const requestsOffset = (filters.requestsPage - 1) * attendancePageSize;
  const [dayResult, requestResult, pendingResult, directory] = await Promise.all([
    days.order('work_date', { ascending: false }).order('user_id').range(daysOffset, daysOffset + attendancePageSize),
    requests.order('created_at', { ascending: false }).order('id').range(requestsOffset, requestsOffset + attendancePageSize),
    client.from('portal_time_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    peoplePromise,
  ]);
  if (dayResult.error || requestResult.error || pendingResult.error)
    throw new Error('دریافت حضور و غیاب و درخواست‌ها انجام نشد؛ دوباره تلاش کنید.');
  const visibleDays = (dayResult.data || []).slice(0, attendancePageSize);
  const visibleRequests = (requestResult.data || []).slice(0, attendancePageSize);
  const owners = new Set([...visibleDays, ...visibleRequests].map(row => row.user_id));
  return {
    days: visibleDays, requests: visibleRequests,
    people: directory.filter(person => owners.has(person.user_id)),
    pendingCount: pendingResult.count || 0,
    hasMoreDays: (dayResult.data?.length || 0) > attendancePageSize,
    hasMoreRequests: (requestResult.data?.length || 0) > attendancePageSize,
  };
}
