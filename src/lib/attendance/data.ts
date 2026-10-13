import 'server-only';
import { requireSession } from '@/lib/auth/session';
import { storedWorkDay } from '@/types/attendance-review';
export async function getWorkData() {
 const { client, user } = await requireSession();
 const userId = user.id;
 async function readDays() {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
   const { data, error } = await client.from('portal_work_days').select('*').eq('user_id', userId).order('work_date', { ascending: false }).range(offset, offset + 999);
   if (error) throw new Error('دریافت حضور و غیاب انجام نشد؛ دوباره تلاش کنید.');
   rows.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  return rows.map(storedWorkDay);
 }
 async function readRequests() {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
   const { data, error } = await client.from('portal_time_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(offset, offset + 999);
   if (error) throw new Error('دریافت درخواست‌ها انجام نشد؛ دوباره تلاش کنید.');
   rows.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  return rows;
 }
 const [days, requests] = await Promise.all([readDays(), readRequests()]);
 return { days, requests };
}
