import { getAccount } from '@/lib/account/data';
import { createClient } from '@/lib/supabase/server';
import { PortalShell } from '@/components/portal/PortalShell';
import { AttendanceAdmin } from '@/components/attendance/AttendanceAdmin';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'مدیریت حضور و غیاب | زیلبر' };
export default async function AttendanceAdminPage() {
 const { user, employee, avatar, accessRole } = await getAccount();
 const client = await createClient();
 if (accessRole !== 'super_admin') return <PortalShell name={employee?.full_name || user.email || 'زیلبر'} accessRole={accessRole} avatar={avatar}><p role="alert">شما به پنل مدیریت دسترسی ندارید.</p></PortalShell>;
 const days = []; const requests = [];
 // Explicit pagination avoids PostgREST's default 1000-row truncation.
 for (let offset = 0; ; offset += 1000) {
  const { data, error } = await client.from('portal_work_days').select('*').order('work_date', { ascending: false }).order('user_id').range(offset, offset + 999);
  if (error) throw new Error('دریافت تردد کارکنان انجام نشد.');
  days.push(...(data || [])); if (!data || data.length < 1000) break;
 }
 for (let offset = 0; ; offset += 1000) {
  const { data, error } = await client.from('portal_time_requests').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 999);
  if (error) throw new Error('دریافت درخواست‌ها انجام نشد.');
  requests.push(...(data || [])); if (!data || data.length < 1000) break;
 }
 const { data: people, error } = await client.rpc('organization_directory', {});
 if (error) throw new Error('دریافت کاربران انجام نشد.');
 return <PortalShell name={employee?.full_name || user.email || 'زیلبر'} accessRole={accessRole} avatar={avatar} gender={employee?.gender}>
  <AttendanceAdmin asOf={new Date().toISOString()} days={days} requests={requests} people={(people || []).map(person => ({ user_id: String(person.auth_user_id || ''), name: String(person.full_name), department: String(person.department || '') }))} />
 </PortalShell>;
}
