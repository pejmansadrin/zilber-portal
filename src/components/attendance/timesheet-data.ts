import { toPersianDate } from "@/lib/persian-date";

// Transcribed from the supplied image. No employee identity was provided.
export const rows = [
  { date: "1405/07/01", day: "چهارشنبه", start: "07:46:00", end: "15:15" },
  { date: "1405/07/02", day: "پنجشنبه", start: "07:53", end: "14:24" },
  { date: "1405/07/03", day: "جمعه", start: null, end: null },
  { date: "1405/07/04", day: "شنبه", start: "07:48", end: "16:15" },
  { date: "1405/07/05", day: "یکشنبه", start: "07:45", end: "17:35" },
  { date: "1405/07/06", day: "دوشنبه", start: "08:01", end: "18:03" },
  { date: "1405/07/07", day: "سه‌شنبه", start: "07:53", end: "17:10" },
  { date: "1405/07/08", day: "چهارشنبه", start: "07:38", end: "16:42" },
  { date: "1405/07/09", day: "پنجشنبه", start: "07:48", end: "16:20" },
  { date: "1405/07/10", day: "جمعه", start: null, end: null },
  { date: "1405/07/11", day: "شنبه", start: "07:26", end: null },
];
export const digits = (value: string) => value.replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const toMinutes = (value: string) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
export const work = (row: typeof rows[number]) => row.start && row.end ? toMinutes(row.end) - toMinutes(row.start) : null;
export const format = (value: number) => digits(`${Math.floor(value / 60).toString().padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`);
export const total = rows.reduce((sum, row) => sum + (work(row) ?? 0), 0);


export const displayTime = (value: string) => digits(value.slice(0, 5));

export function previewEntryForDay(stamp: string) {
  const date = new Date(stamp).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const row = rows.find(row => row.date === toPersianDate(date));
  if (!row?.start) return null;
  return { date, start: new Date(`${date}T${row.start.length === 5 ? row.start + ":00" : row.start}+03:30`).toISOString(),
    end: row.end ? new Date(`${date}T${row.end}:00+03:30`).toISOString() : null };
}
