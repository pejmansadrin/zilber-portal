"use client";

import { useMemo, useState } from "react";
import { toPersianDate } from "@/lib/persian-date";
import { rows, digits, displayTime, work, format } from "./timesheet-data";
import { modeLabel, workBalance, type WorkDay, type WorkMode } from "@/domain/attendance/work-sessions";
import s from "./AttendanceWorkspace.module.css";
import { jalaliMonth } from "@/lib/jalali-calendar";
import { tehranClock } from "@/lib/clock-format";
import { capsuleRadius } from "./capsule-radius";

const weekdayLetters: Record<string, string> = { "شنبه": "ش", "یکشنبه": "ی", "دوشنبه": "د", "سه‌شنبه": "س", "چهارشنبه": "چ", "پنجشنبه": "پ", "جمعه": "ج" };
const hours = Array.from({ length: 25 }, (_, index) => index);
const position = (time: string) => {
  const [hours, minutes, seconds = 0] = time.split(":").map(Number);
  return (hours * 60 + minutes + seconds / 60) / 1440 * 100;
};
type CalendarDay = { date: string; iso: string; day: number; weekday: string; row: typeof rows[number] | undefined; valid: boolean };
function describe(day: CalendarDay) {
  if (!day.valid) return `${digits(day.date)}؛ مهر ۳۰ روز دارد و این روز در تقویم وجود ندارد.`;
  const row = day.row;
  return `${digits(day.date)}، ${day.weekday}؛ ${row?.start ? row.end ? `ورود ${displayTime(row.start)}، خروج ${displayTime(row.end)}، مدت حضور ${format(work(row)!)}.` : `ورود ${displayTime(row.start)}، خروج ثبت‌نشده.` : row ? "بدون تردد در تصویر." : "داده‌ای ثبت نشده."}`;
}

export function AttendanceGantt({ person, currentTime, todayEntry, workDays, month: selectedMonth }: { person: string; currentTime: string; todayEntry: WorkDay | null; workDays?: WorkDay[]; month?: string }) {
  const date = new Date(currentTime);
  const currentDay = toPersianDate(date.toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }));
    const nowPosition = position(tehranClock(currentTime));
  const month = selectedMonth || currentDay.slice(0, 7);
  const byDate = useMemo(() => new Map(workDays?.map(day => [day.date, day])), [workDays]);
  const calendar = useMemo(() => {
    const [year, number] = (workDays ? month : "1405/07").split("/").map(Number);
    const weekday = new Intl.DateTimeFormat("fa-IR", { weekday: "long", timeZone: "UTC" });
    return jalaliMonth(year, number).cells.filter(cell => cell !== null).map(cell => {
      const jalali = `${year}/${String(number).padStart(2, "0")}/${String(cell.day).padStart(2, "0")}`;
      const entry = byDate.get(cell.iso);
      return { date: jalali, iso: cell.iso, day: cell.day, weekday: weekday.format(new Date(`${cell.iso}T12:00:00Z`)), valid: true,
        row: workDays ? entry ? { date: jalali, day: "", start: tehranClock(entry.start), end: entry.end ? tehranClock(entry.end) : null } : undefined : rows.find(row => row.date === jalali) };
    });
  }, [month, byDate, workDays]);
  const todayDate = todayEntry ? toPersianDate(todayEntry.date) : null;
  const displayDays = calendar.map(day => todayEntry && todayDate === day.date ? { ...day, row: { date: day.date, day: day.weekday, start: tehranClock(todayEntry.start), end: todayEntry.end ? tehranClock(todayEntry.end) : null } } : day);
  const [selected, setSelected] = useState(1);
  const selectedDay = displayDays[Math.min(selected - 1, displayDays.length - 1)];
  return <div className={s.gantt}>
    <div className={s.heatHeading}><div><h3>نمودار ساعات حضور ماهانه</h3><p>{workDays ? digits(month) : "مهر ۱۴۰۵"} · {person}</p></div><span className={s.badge}>هر ردیف، یک روز</span></div>
    <div className={s.ganttScroll}><div className={s.ganttCanvas}>
      <div className={s.ganttHeader}><span className={s.ganttDayHeading}>روز</span><span className={s.ganttWeekHeading} title="روز هفته">هفته</span><span className={s.ganttColumnHeading}>ورود</span><span className={s.ganttColumnHeading}>خروج</span><span className={s.ganttColumnHeading}>اضافه‌کار</span><span className={s.ganttColumnHeading}>مدت حضور</span><div className={s.ganttAxis} dir="ltr">{hours.map(hour => <span key={hour} style={{ left: `${hour / 24 * 100}%` }}>{digits(String(hour))}</span>)}</div></div>
      {displayDays.map(day => {
        const row = day.row;
        const officialStart = "08:00";
        const officialEnd = day.weekday === "پنجشنبه" ? "12:00" : "15:00";
        const shiftStart = position(officialStart);
        const shiftEnd = position(officialEnd);
        const workingDay = day.valid && day.weekday !== "جمعه";
        const storedDay = byDate.get(day.iso) || (todayEntry && todayDate === day.date ? todayEntry : null);
        const daySessions = storedDay ? storedDay.sessions.map(session => ({ start: tehranClock(session.start), end: session.end ? tehranClock(session.end) : null, mode: session.mode })) : row?.start ? [{ start: row.start, end: row.end, mode: "office" as WorkMode }] : [];
        const spans = daySessions.map(session => {
          const start = position(session.start);
          const live = !session.end && day.date === currentDay && nowPosition >= start;
          const end = session.end ? position(session.end) : live ? nowPosition : start;
          return { ...session, startPosition: start, endPosition: end, live,
            extraStart: Math.max(start, shiftEnd), extra: workingDay && session.mode !== "mission" ? Math.max(0, end - Math.max(start, shiftEnd)) : 0 };
        });
        const baseRanges = spans.filter(span => span.mode !== "mission").map(span => ({ start: span.startPosition * 14.4, end: span.endPosition * 14.4 }));
        const live = spans.some(span => span.live && span.mode !== "mission");
        const balance = workBalance(spans.filter(span => span.mode !== "mission").map(span => ({ start: span.startPosition * 14.4, end: span.endPosition * 14.4 })), workingDay ? (day.weekday === "پنجشنبه" ? 720 : 900) : null);
        const extraMinutes = Math.floor(balance.overtime + .000001);
        const totalMinutes = Math.floor(balance.worked + .000001);
        const label = `${workDays ? `${digits(day.date)}، ${day.weekday}.` : describe(day)} ${workingDay ? `ساعت رسمی ${digits(officialStart)} تا ${digits(officialEnd)}.` : "روز تعطیل."}${extraMinutes ? ` حضور بعد از ساعت رسمی ${format(extraMinutes)}${live ? "، موقت" : ""}.` : ""}`;
        return <button type="button" key={day.date} className={`${s.ganttRow} ${day.weekday === "جمعه" ? s.ganttFriday : ""} ${!day.valid ? s.ganttInvalid : ""}`} aria-label={label} aria-pressed={selected === day.day} onClick={() => setSelected(day.day)}>
          <span className={s.ganttDay}><strong>{digits(String(day.day).padStart(2, "0"))}</strong></span><span className={s.ganttWeekday} title={day.valid ? day.weekday : "روز نامعتبر"}>{day.valid ? weekdayLetters[day.weekday] : "—"}</span>
          <span className={s.ganttDuration}><span dir="ltr">{row?.start ? displayTime(row.start) : "—"}</span></span>
          <span className={s.ganttDuration}>{row?.end ? <span dir="ltr">{displayTime(row.end)}</span> : "—"}</span>
          <span className={`${s.ganttDuration} ${extraMinutes > 0 ? s.ganttExtraValue : ""} ${live ? s.ganttUnfinalized : ""}`} title="حضور بعد از پایان ساعت رسمی؛ تأیید اضافه‌کاری در مرحلهٔ بعد انجام می‌شود">{row?.start && (row.end || live) ? <span><span dir="ltr">{format(extraMinutes)}</span></span> : "—"}</span>
          <span className={`${s.ganttDuration} ${live ? s.ganttUnfinalized : ""}`}>{spans.length && (row?.end || live) ? <span dir="ltr">{format(totalMinutes)}</span> : "—"}</span>
          <span className={s.ganttTrack} dir="ltr">
            {workingDay && <span className={s.ganttOfficial} style={{ left: `${shiftStart}%`, width: `${shiftEnd - shiftStart}%` }} title={`ساعت کاری رسمی: ${digits(officialStart)} تا ${digits(officialEnd)}`}>{!spans.length && <span className={s.ganttOfficialEmpty}>{row ? "بدون تردد" : "بدون داده"}</span>}</span>}
            {spans.map((span, index) => {
              const start = span.startPosition;
              const end = span.endPosition;
              const regular = balance.regularRanges.map(range => ({ start: Math.max(start, range.start / 14.4), end: Math.min(end, range.end / 14.4) })).filter(range => range.end > range.start);
              const radius = capsuleRadius(start * 14.4, end * 14.4, baseRanges);
              const title = `${modeLabel(span.mode)}: ${displayTime(span.start)} تا ${span.end ? displayTime(span.end) : "اکنون"}`;
              if (!span.end && !span.live) return <span key={index} className={s.ganttMarker} style={{ left: `${start}%` }} title="خروج ثبت نشده" />;
              if (span.mode === "mission") return <span key={index} data-mode="mission" className={`${s.ganttBar} ${span.live ? s.ganttLive : s.ganttMission}`} style={{ left: `${start}%`, width: `${Math.max(0, end - start)}%` }} title={title} />;
              return <span key={index}>
                <span className={`${s.ganttOuter} ${span.live ? s.ganttLive : ""}`} style={{ left: `${start}%`, width: `${Math.max(0, end - start)}%`, borderRadius: radius }} title={title} />
                {regular.map((range, regularIndex) => <span key={regularIndex} data-mode={span.mode} className={`${s.ganttBar} ${span.live ? s.ganttLive : span.mode === "remote" ? s.ganttRemote : ""}`} style={{ left: `${range.start}%`, width: `${range.end - range.start}%` }} title={title} />)}
              </span>;
            })}
            {!spans.length && !workingDay && <span className={s.ganttEmpty}>{!day.valid ? "این ماه ۳۰ روز دارد" : row ? "بدون تردد" : "بدون داده"}</span>}
          </span>
        </button>;
      })}
    </div></div>
    <div className={s.ganttLegend}><span><i className={s.ganttLegendOfficial} />ساعت کاری رسمی</span><span><i className={s.ganttLegendLive} />حضور نهایی‌نشده</span><span><i className={s.ganttLegendBar} />عادی</span><span><i className={s.ganttLegendRemote} />دورکاری</span><span><i className={s.ganttLegendMission} />مأموریت</span><span><i className={s.ganttLegendExtra} />اضافه‌کار خالص</span><span><i className={s.ganttLegendMarker} />ورود بدون خروج</span><span>جمعه‌ها با زمینهٔ متفاوت</span></div>
    <p className={s.heatDetails} aria-live="polite">{todayEntry && toPersianDate(todayEntry.date) === selectedDay.date ? todayEntry.sessions.map(session => `${modeLabel(session.mode)}: ${displayTime(tehranClock(session.start))} تا ${session.end ? displayTime(tehranClock(session.end)) : "اکنون"}`).join(" · ") : workDays ? `${digits(selectedDay.date)}؛ ${selectedDay.row ? "تردد ثبت‌شده" : "بدون دادهٔ ثبت‌شده"}` : describe(selectedDay)}</p>
    <p className={s.sheetDisclaimer}>محور ساعت به وقت تهران است. نوار کم‌اشباع با حرکت نرمِ پرشدن، حضور احتمالی امروز تا ساعت فعلی است و خروج قطعی محسوب نمی‌شود؛ با ثبت خروج به نوار سرمه‌ای تبدیل می‌شود. بازهٔ زمینه، ساعت رسمی همان روز است؛ حضور قبل از ۸ و پس از پایان ساعت رسمی، بعد از کسر جبران کسری موظفی، به‌عنوان اضافه‌کار خالص نمایش داده می‌شود. مأموریت داخل کار اصلی است و دوباره شمرده نمی‌شود. ردیف‌های بدون داده به معنی غیبت نیستند.</p>
  </div>;
}
