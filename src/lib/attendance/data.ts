import 'server-only';
import { requireSession } from '@/lib/auth/session';
import { storedWorkDay } from '@/types/attendance-review';
import { requestHistoryPageSize, type AttendanceHistory } from '@/domain/attendance/history';

export async function getWorkData(history: AttendanceHistory) {
  const { client, user } = await requireSession();
  const columns = 'user_id,work_date,sessions,revision,updated_at';
  const offset = (history.requestsPage - 1) * requestHistoryPageSize;
  const [month, active, requests, pending] = await Promise.all([
    client.from('portal_work_days').select(columns).eq('user_id', user.id)
      .gte('work_date', history.first).lt('work_date', history.until)
      .order('work_date', { ascending: false }).limit(31),
    // An overnight or older open session must remain closable in any month.
    client.from('portal_work_days').select(columns).eq('user_id', user.id)
      .contains('sessions', [{ end: null }]).order('work_date', { ascending: false }).limit(1).maybeSingle(),
    client.from('portal_time_requests').select('id,work_date,kind,action,mode,requested_at,requested_until,session_index,reason,status,review_note,reviewed_at,created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false }).order('id').range(offset, offset + requestHistoryPageSize),
    // Registration authority is independent of the visible history page.
    client.from('portal_time_requests').select('*').eq('user_id', user.id)
      .eq('status', 'pending').eq('kind', 'time').eq('action', 'start')
      .neq('mode', 'mission').is('session_index', null).not('requested_at', 'is', null).is('requested_until', null)
      .order('created_at', { ascending: false }).order('id').limit(1).maybeSingle(),
  ]);
  if (month.error || active.error || requests.error || pending.error)
    throw new Error('دریافت حضور و غیاب انجام نشد؛ دوباره تلاش کنید.');
  const rows = new Map((month.data || []).map(row => [row.work_date, row]));
  if (active.data) rows.set(active.data.work_date, active.data);
  return {
    days: [...rows.values()].map(storedWorkDay),
    requests: (requests.data || []).slice(0, requestHistoryPageSize),
    pendingEntry: pending.data,
    hasMoreRequests: (requests.data?.length || 0) > requestHistoryPageSize,
  };
}
