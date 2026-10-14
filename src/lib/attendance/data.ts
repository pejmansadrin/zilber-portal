import 'server-only';
import { requireSession } from '@/lib/auth/session';
import { storedWorkDay } from '@/types/attendance-review';
import { requestHistoryPageSize, type AttendanceHistory } from '@/domain/attendance/history';

const dayColumns = 'user_id,work_date,sessions,revision,updated_at';
const requestColumns = 'id,work_date,kind,action,mode,requested_at,requested_until,session_index,reason,status,review_note,reviewed_at,created_at';

// The registration path never reads history. Current/overnight context is independent
// of the selected month and of failures in the optional history panels.
export async function getRegistrationData(now: string) {
  const { client, user } = await requireSession();
  const date = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
  const [today, active, pending] = await Promise.all([
    client.from('portal_work_days').select(dayColumns).eq('user_id', user.id)
      .eq('work_date', date).maybeSingle(),
    client.from('portal_work_days').select(dayColumns).eq('user_id', user.id)
      // sessions is JSONB; a JS array makes contains() emit PostgreSQL array syntax.
      .contains('sessions', JSON.stringify([{ end: null }])).order('work_date', { ascending: false }).limit(1).maybeSingle(),
    client.from('portal_time_requests').select('id,mode,requested_at').eq('user_id', user.id)
      .eq('status', 'pending').eq('kind', 'time').eq('action', 'start')
      .neq('mode', 'mission').is('session_index', null).not('requested_at', 'is', null).is('requested_until', null)
      .order('created_at', { ascending: false }).order('id').limit(1).maybeSingle(),
  ]);
  if (today.error || active.error || pending.error)
    throw new Error('دریافت وضعیت تردد انجام نشد؛ دوباره تلاش کنید.');
  const days = new Map([today.data, active.data].filter(row => row !== null).map(row => [row.work_date, row]));
  return { days: [...days.values()].map(storedWorkDay), pendingEntry: pending.data };
}

export async function getMonthHistory(history: AttendanceHistory, session?: Awaited<ReturnType<typeof requireSession>>) {
  const { client, user } = session ?? await requireSession();
  const { data, error } = await client.from('portal_work_days').select(dayColumns).eq('user_id', user.id)
    .gte('work_date', history.first).lt('work_date', history.until)
    .order('work_date', { ascending: false }).limit(31);
  if (error) throw new Error('دریافت سوابق ماه انجام نشد؛ دوباره تلاش کنید.');
  return { days: (data || []).map(storedWorkDay) };
}

export async function getRequestHistory(history: AttendanceHistory, session?: Awaited<ReturnType<typeof requireSession>>) {
  const { client, user } = session ?? await requireSession();
  const offset = (history.requestsPage - 1) * requestHistoryPageSize;
  const { data, error } = await client.from('portal_time_requests').select(requestColumns).eq('user_id', user.id)
    .order('created_at', { ascending: false }).order('id').range(offset, offset + requestHistoryPageSize);
  if (error) throw new Error('دریافت مکاتبات انجام نشد؛ دوباره تلاش کنید.');
  return { requests: (data || []).slice(0, requestHistoryPageSize), hasMoreRequests: (data?.length || 0) > requestHistoryPageSize };
}
