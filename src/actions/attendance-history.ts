'use server';
import { requireSession } from '@/lib/auth/session';
import { storedWorkDay } from '@/types/attendance-review';
import { selectableCalendarDate } from '@/lib/jalali-calendar';

// Load only the date selected for correction, including dates outside the page's month.
export async function getCorrectionDay(date: string) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
  if (!selectableCalendarDate(date, today)) throw new Error('تاریخ معتبر انتخاب کنید.');
  const { client, user } = await requireSession();
  const { data, error } = await client.from('portal_work_days')
    .select('user_id,work_date,sessions,revision,updated_at')
    .eq('user_id', user.id).eq('work_date', date).maybeSingle();
  if (error) throw new Error('دریافت بازه‌های این روز انجام نشد؛ دوباره تلاش کنید.');
  return data ? storedWorkDay(data) : null;
}
