"use client";

import { toPersianDate } from "@/lib/persian-date";
import { useState } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import s from "./AttendanceWorkspace.module.css";

import { rows, digits, displayTime, work, format } from "./timesheet-data";
import { sessionMinutes, type WorkDay } from "./work-sessions";
import { AttendanceGantt } from "./AttendanceGantt";

export function TimesheetPreview({ name, currentTime, todayEntry }: { name: string; currentTime: string; todayEntry: WorkDay | null }) {
  const [filter, setFilter] = useState("all");
  const localTime = (stamp: string) => new Date(stamp).toLocaleTimeString("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false });
  const displayRows = rows.map(row => todayEntry && row.date === toPersianDate(todayEntry.date) ? { ...row, start: localTime(todayEntry.start), end: todayEntry.end ? localTime(todayEntry.end) : null } : row);
  const rowMinutes = (row: typeof rows[number]) => todayEntry && row.date === toPersianDate(todayEntry.date) ? sessionMinutes(todayEntry.sessions) : work(row);
  const total = displayRows.reduce((sum, row) => sum + (rowMinutes(row) ?? 0), 0);
  const completeCount = displayRows.filter(row => row.start && row.end).length;
  const openCount = displayRows.filter(row => row.start && !row.end).length;
  const visible = displayRows.filter(row => filter === "all" || (filter === "incomplete" ? row.start && !row.end : row.start && row.end));
  return <section className={`${s.card} ${s.timesheet}`} aria-labelledby="timesheet-heading">
    <div className={s.sheetHeading}><div><p className={s.eyebrow}>گزارش ماهانهٔ تردد</p><h2 id="timesheet-heading">تایم‌شیت ورود و خروج</h2></div><span className={s.month}><CalendarDays size={18} /> مهر ۱۴۰۵</span></div>
    <div className={s.sheetToolbar}><label className={s.filter}>وضعیت<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">همهٔ روزها</option><option value="complete">تردد کامل</option><option value="incomplete">خروج ثبت‌نشده</option></select></label></div>
    <AttendanceGantt person={name} currentTime={currentTime} todayEntry={todayEntry} />
    <div className={s.sheetTableWrap}><table className={s.sheetTable}><caption className={s.sheetCaption}>تایم‌شیت نمونهٔ مهر ۱۴۰۵ — {name}</caption><thead><tr><th scope="col">تاریخ</th><th scope="col">روز</th><th scope="col">ساعت ورود</th><th scope="col">ساعت خروج</th><th scope="col">مدت حضور</th><th scope="col">وضعیت</th></tr></thead><tbody>{visible.map(row => {
      const value = row.end ? rowMinutes(row) : null; const holiday = row.day === "جمعه";
      return <tr key={row.date} className={holiday ? s.holidayRow : value === null ? s.incompleteRow : undefined}><th scope="row"><span dir="ltr">{digits(row.date)}</span></th><td>{row.day}</td><td><span dir="ltr">{row.start ? displayTime(row.start) : "—"}</span></td><td><span dir="ltr">{row.end ? displayTime(row.end) : "—"}</span></td><td><span dir="ltr">{value === null ? "—" : format(value)}</span></td><td><span className={s.sheetStatus}>{holiday ? "جمعه" : value === null ? "خروج ثبت‌نشده" : "تردد کامل"}</span></td></tr>;
    })}</tbody><tfoot><tr><th scope="row" colSpan={4}>جمع کارکرد ثبت‌شده</th><td><span dir="ltr">{format(total)}</span></td><td>{digits(String(completeCount))} روز کامل</td></tr></tfoot></table></div>
    <div className={s.sheetFooter}><span><Clock3 size={15} /> کارکرد = مجموع بازه‌ها؛ فاصلهٔ بین بازه‌ها محاسبه نمی‌شود</span><span>{digits(String(openCount))} خروج ثبت‌نشده · ۲ جمعه</span></div>

  </section>;
}
