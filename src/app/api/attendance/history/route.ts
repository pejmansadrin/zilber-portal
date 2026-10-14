import { getSession } from '@/lib/auth/session';
import { attendanceHistory } from '@/domain/attendance/history';
import { getMonthHistory, getRequestHistory } from '@/lib/attendance/data';

const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie' };
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ message: 'برای ادامه دوباره وارد حساب شوید.' }, { status: 401, headers });
  const query = new URL(request.url).searchParams;
  const section = query.get('section');
  if (section !== 'month' && section !== 'requests') return Response.json({ message: 'بخش انتخاب‌شده معتبر نیست.' }, { status: 400, headers });
  let history;
  try { history = attendanceHistory(Object.fromEntries(query), new Date().toISOString()); }
  catch { return Response.json({ message: 'ماه انتخاب‌شده معتبر نیست.' }, { status: 400, headers }); }
  try {
    const data = section === 'month' ? await Promise.all([
      getMonthHistory(history, session),
      session.client.from('employees').select('full_name').eq('auth_user_id', session.user.id).maybeSingle(),
    ]).then(([month, identity]) => ({ ...month, name: identity.data?.full_name || String(session.user.user_metadata.full_name || 'همکار زیلبر') })) : await getRequestHistory(history, session);
    return Response.json(data, { headers });
  } catch {
    return Response.json({ message: 'دریافت اطلاعات انجام نشد؛ دوباره تلاش کنید.' }, { status: 503, headers });
  }
}
