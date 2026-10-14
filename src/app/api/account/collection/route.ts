import { getSession } from '@/lib/auth/session';
import { getAccountCollection } from '@/lib/account/data';
import { collections } from '@/lib/account-fields';

const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie' };
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ message: 'برای ادامه دوباره وارد حساب شوید.' }, { status: 401, headers });
  const query = new URL(request.url).searchParams;
  const collection = query.get('collection');
  const page = Number(query.get('page') || '1');
  if (!collections.some(item => item.id === collection) || !Number.isSafeInteger(page) || page < 1 || page > 10000)
    return Response.json({ message: 'بخش انتخاب‌شده معتبر نیست.' }, { status: 400, headers });
  try { return Response.json(await getAccountCollection(collection!, page, session), { headers }); }
  catch { return Response.json({ message: 'دریافت این بخش انجام نشد؛ دوباره تلاش کنید.' }, { status: 503, headers }); }
}
