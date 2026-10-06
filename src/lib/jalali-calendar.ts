import { fromPersianDate, toPersianDate } from './persian-date';

export const jalaliMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
export const jalaliWeekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
export const persianDigits = (value: string | number) => String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
const dayMilliseconds = 86400000;
export function addCalendarDays(iso: string, count: number) {
  return new Date(Date.parse(iso + 'T12:00:00Z') + count * dayMilliseconds).toISOString().slice(0, 10);
}
export function jalaliParts(iso: string) {
  const [year, month, day] = toPersianDate(iso).split('/').map(Number);
  return { year, month, day };
}
export function moveJalaliMonth(year: number, month: number, offset: number) {
  const absolute = year * 12 + month - 1 + offset;
  return { year: Math.floor(absolute / 12), month: (absolute % 12 + 12) % 12 + 1 };
}
export function jalaliMonth(year: number, month: number) {
  const first = fromPersianDate(`${year}/${month}/01`);
  if (!first) throw new Error('ماه شمسی نامعتبر است.');
  const next = moveJalaliMonth(year, month, 1);
  // The existing Intl Persian converter is authoritative for leap years too.
  // For the upper supported year boundary, discover the next month by Gregorian days.
  let nextFirst = fromPersianDate(`${next.year}/${next.month}/01`);
  if (!nextFirst) {
    for (let offset = 28; offset <= 32; offset++) {
      const iso = addCalendarDays(first, offset);
      if (jalaliParts(iso).day === 1) { nextFirst = iso; break; }
    }
  }
  if (!nextFirst) throw new Error('مرز ماه شمسی پیدا نشد.');
  const length = Math.round((Date.parse(nextFirst) - Date.parse(first)) / dayMilliseconds);
  const leading = (new Date(first + 'T12:00:00Z').getUTCDay() + 1) % 7;
  // Always reserve six weeks so changing months cannot resize the calendar modal.
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - leading + 1;
    return day > 0 && day <= length ? { day, iso: addCalendarDays(first, day - 1) } : null;
  });
  return { first, length, leading, cells };
}
export function dateInJalaliMonth(year: number, month: number, day: number) {
  const calendar = jalaliMonth(year, month);
  return addCalendarDays(calendar.first, Math.max(1, Math.min(day, calendar.length)) - 1);
}
export function selectableCalendarDate(iso: string, max: string, min?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const stamp = new Date(iso + 'T12:00:00Z');
  if (!Number.isFinite(stamp.getTime()) || stamp.toISOString().slice(0, 10) !== iso) return false;
  const { year } = jalaliParts(iso);
  return year >= 1200 && year <= 1600 && iso <= max && (!min || iso >= min);
}
