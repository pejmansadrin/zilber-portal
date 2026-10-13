"use client";

import { modeLabel, estimatedWorkEnd, workBalance, type WorkDay } from "@/domain/attendance/work-sessions";
import s from "./TodayWorkTimeline.module.css";
import { capsuleRadius } from "./capsule-radius";

const localTime = (stamp: string) => new Date(stamp).toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false });
const digits = (number: number) => String(number).replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const position = (stamp: string) => {
  const [hour, minute, second] = new Date(stamp).toLocaleTimeString("en-GB", { timeZone: "Asia/Tehran", hour12: false }).split(":").map(Number);
  return (hour * 3600 + minute * 60 + second) / 86400 * 100;
};
export function TodayWorkTimeline({ day, currentTime }: { day: WorkDay | null; currentTime: string }) {
  const date = new Date(currentTime).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const weekday = new Date(currentTime).toLocaleDateString("en-US", { timeZone: "Asia/Tehran", weekday: "long" });
  const targetMinutes = weekday === "Friday" ? 0 : weekday === "Thursday" ? 240 : 420;
  const officialEnd = weekday === "Thursday" ? 12 : 15;
  const estimated = estimatedWorkEnd(day, targetMinutes);
  const estimatedSameDay = estimated && new Date(estimated).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }) === date;
  const currentPosition = position(currentTime);
  const baseRanges = (day?.sessions || []).filter(session => session.mode !== "mission").map(session => ({ start: position(session.start) * 14.4, end: (session.end ? position(session.end) : currentPosition) * 14.4 }));
  const connectedRanges = estimated && estimatedSameDay && position(estimated) > currentPosition ? [...baseRanges, { start: currentPosition * 14.4, end: position(estimated) * 14.4 }] : baseRanges;
  const balance = workBalance(baseRanges, targetMinutes ? officialEnd * 60 : null);
  return <div className={s.timeline}>
    <div className={s.heading}><h3>بازه‌های امروز</h3>{estimated ? <span>خروج تقریبی <strong>{localTime(estimated)}</strong>{!estimatedSameDay && " · روز بعد"}</span> : <span>{targetMinutes ? `ساعت رسمی: ۸ تا ${digits(officialEnd)}` : "جمعه · تعطیل"}</span>}</div>
    <div className={s.scroll}><div className={s.canvas}>
      <div className={s.axis} dir="ltr">{Array.from({ length: 13 }, (_, index) => index * 2).map(hour => <span key={hour} style={{ left: `${hour / 24 * 100}%` }}>{digits(hour)}</span>)}</div>
      <div className={s.track} dir="ltr" role="img" aria-label={`بازه‌های کاری امروز${estimated ? `؛ خروج تقریبی ${localTime(estimated)}` : ""}`}>
        {targetMinutes > 0 && <span className={s.official} style={{ left: `${8 / 24 * 100}%`, width: `${(officialEnd - 8) / 24 * 100}%` }} title={`ساعت رسمی: ۸ تا ${digits(officialEnd)}`} />}
        {estimated && estimatedSameDay && position(estimated) > currentPosition && <span className={s.remaining} style={{ left: `${currentPosition}%`, width: `${position(estimated) - currentPosition}%`, borderRadius: capsuleRadius(currentPosition * 14.4, position(estimated) * 14.4, connectedRanges) }} title="زمان باقی‌مانده تا تکمیل کارکرد روز" />}
        {day?.sessions.map((session, index) => {
          const start = position(session.start);
          const end = session.end ? position(session.end) : currentPosition;
          const regular = balance.regularRanges.map(range => ({ start: Math.max(start, range.start / 14.4), end: Math.min(end, range.end / 14.4) })).filter(range => range.end > range.start);
          const title = `${modeLabel(session.mode)}: ${localTime(session.start)} تا ${session.end ? localTime(session.end) : "اکنون"}`;
          if (session.mode === "mission") return <span key={session.start + index} className={`${s.bar} ${!session.end ? s.live : ""}`} data-mode="mission" style={{ left: `${start}%`, width: `${Math.max(0, end - start)}%` }} title={title} />;
          return <span key={session.start + index}>
            <span className={`${s.outer} ${!session.end ? s.live : ""}`} style={{ left: `${start}%`, width: `${Math.max(0, end - start)}%`, borderRadius: capsuleRadius(start * 14.4, end * 14.4, connectedRanges) }} title={title} />
            {regular.map((range, regularIndex) => <span key={regularIndex} className={`${s.bar} ${!session.end ? s.live : ""}`} data-mode={session.mode} style={{ left: `${range.start}%`, width: `${range.end - range.start}%` }} title={title} />)}
          </span>;
        })}
        <span className={s.now} style={{ left: `${currentPosition}%` }} title={`اکنون ${localTime(currentTime)}`} />
        {estimated && estimatedSameDay && <span className={s.estimate} style={{ left: `${position(estimated)}%` }} title={`خروج تقریبی ${localTime(estimated)}`}><span>{localTime(estimated)}</span></span>}
        {!day && <span className={s.empty}>بعد از ثبت ورود، بازهٔ امروز اینجا نمایش داده می‌شود.</span>}
      </div>
    </div></div>
    <div className={s.legend}><span>اضافه‌کار خالص: {digits(Math.floor(balance.overtime))} دقیقه</span>{balance.credit > 0 && <span>جبران موظفی: {digits(Math.floor(balance.credit))} دقیقه</span>}<span><i className={s.nowKey} />اکنون</span><span><i className={s.estimateKey} />خروج تقریبی</span>{estimated && <span className={s.assumption}>برآورد برای تکمیل {digits(targetMinutes / 60)} ساعت کار؛ فاصلهٔ بین بازه‌ها محاسبه نمی‌شود.</span>}</div>
  </div>;
}
