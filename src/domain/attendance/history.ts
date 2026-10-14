import { jalaliMonth, jalaliParts, moveJalaliMonth, addCalendarDays } from '@/lib/jalali-calendar';
export const requestHistoryPageSize = 30;
export type AttendanceHistorySearch = { month?: string | string[]; requestsPage?: string | string[] };
export function attendanceHistory(search: AttendanceHistorySearch, now: string) {
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
  const current = jalaliParts(today);
  const currentMonth = `${current.year}/${String(current.month).padStart(2, '0')}`;
  const raw = typeof search.month === 'string' ? search.month : currentMonth;
  const match = raw.match(/^(1[2-6]\d{2})\/(0[1-9]|1[0-2])$/);
  if (!match || Number(match[1]) > 1600 || raw > currentMonth) throw new Error('ماه انتخاب‌شده معتبر نیست.');
  const year = Number(match[1]), month = Number(match[2]);
  const calendar = jalaliMonth(year, month);
  const previous = moveJalaliMonth(year, month, -1), next = moveJalaliMonth(year, month, 1);
  const monthName = (value: { year: number; month: number }) => `${value.year}/${String(value.month).padStart(2, '0')}`;
  const page = typeof search.requestsPage === 'string' ? Number(search.requestsPage) : 1;
  return {
    month: raw, first: calendar.first, until: addCalendarDays(calendar.first, calendar.length),
    previousMonth: previous.year >= 1200 ? monthName(previous) : null,
    nextMonth: raw < currentMonth ? monthName(next) : null,
    requestsPage: Number.isSafeInteger(page) && page > 0 && page <= 10000 ? page : 1,
  };
}
export type AttendanceHistory = ReturnType<typeof attendanceHistory>;
