import { fromPersianDate, latinDigits } from '@/lib/persian-date';

export const attendancePageSize = 50;
export type AttendanceSearchParams = Record<string, string | string[] | undefined>;
export type AttendanceFilters = {
  query: string;
  date: string | null;
  dateInput: string;
  status: 'pending' | 'approved' | 'rejected' | 'all';
  daysPage: number;
  requestsPage: number;
};

function text(value: string | string[] | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function page(value: string | string[] | undefined) {
  const raw = latinDigits(text(value));
  const number = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(number) && number >= 1 && number <= 10000 ? number : 1;
}

export function attendanceFilters(params: AttendanceSearchParams): AttendanceFilters {
  const dateInput = text(params.date).slice(0, 20);
  const date = dateInput ? fromPersianDate(dateInput) : null;
  if (dateInput && !date) throw new Error('تاریخ شمسی معتبر وارد کنید؛ مانند ۱۴۰۵/۰۷/۱۲.');
  const status = text(params.status);
  return {
    query: text(params.q).slice(0, 150), date, dateInput,
    status: status === 'approved' || status === 'rejected' || status === 'all' ? status : 'pending',
    daysPage: page(params.daysPage), requestsPage: page(params.requestsPage),
  };
}

export function attendanceAdminHref(filters: AttendanceFilters, changes: Partial<AttendanceFilters> = {}) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.query) params.set('q', next.query);
  if (next.dateInput) params.set('date', next.dateInput);
  if (next.status !== 'pending') params.set('status', next.status);
  if (next.daysPage > 1) params.set('daysPage', String(next.daysPage));
  if (next.requestsPage > 1) params.set('requestsPage', String(next.requestsPage));
  return `/admin/attendance${params.size ? `?${params}` : ''}`;
}
