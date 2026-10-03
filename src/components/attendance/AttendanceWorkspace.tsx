"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Check, Building2, Laptop, BriefcaseBusiness, LogIn, LogOut } from "lucide-react";
import s from "./AttendanceWorkspace.module.css";
import { previewEntryForDay } from "./timesheet-data";
import { TodayWorkTimeline } from "./TodayWorkTimeline";
import { TimePicker } from "./TimePicker";
import { TimesheetPreview } from "./TimesheetPreview";

import { asWorkDay, transitionWork, sessionMinutes, modeLabel, type WorkMode, type WorkDay } from "./work-sessions";
import { format } from "./timesheet-data";
const workModes = [{ value: "office", label: "عادی", icon: Building2 }, { value: "remote", label: "دورکاری", icon: Laptop }, { value: "mission", label: "مأموریت", icon: BriefcaseBusiness }] as const;
const time = (stamp: string) => new Date(stamp).toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false });
const localTime = (stamp: string) => new Date(stamp).toLocaleTimeString("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false });

export function AttendanceWorkspace({ initialTime, name }: { initialTime: string; name: string }) {
  const [now, setNow] = useState(() => new Date(initialTime));
  const [entry, setToday] = useState<WorkDay | null>(() => asWorkDay(previewEntryForDay(initialTime)));
  const workDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const today = entry?.date === workDate ? entry : asWorkDay(previewEntryForDay(now.toISOString()));
  const active = today?.sessions.find(session => session.mode !== "mission" && !session.end);
  const mission = today?.sessions.find(session => session.mode === "mission" && !session.end);
  const [workMode, setWorkMode] = useState<WorkMode>("office");
  const [selectedTime, setSelectedTime] = useState(() => localTime(initialTime));
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const value = edited ? selectedTime : localTime(now.toISOString());
  function register(action: "start" | "end", nextMode = workMode) {
    setError(""); setMessage("");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) { setError("ساعت را وارد کنید."); return; }
    const stamp = new Date();
    const date = stamp.toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
    const selected = edited ? new Date(`${date}T${value}:00+03:30`) : stamp;
    try {
      const next = transitionWork(today, date, selected.toISOString(), stamp.toISOString(), action, nextMode);
      setToday(next);
      if (action === "start") setWorkMode(nextMode);
      setMessage(action === "end" ? `${modeLabel(nextMode)} ساعت ${time(selected.toISOString())} پایان یافت.` : nextMode === "mission" ? `مأموریت از ${time(selected.toISOString())} در کار ${modeLabel(active!.mode)} شروع شد.` : active ? `${modeLabel(active.mode)} پایان یافت؛ ${modeLabel(nextMode)} از ${time(selected.toISOString())} شروع شد.` : `${modeLabel(nextMode)} از ${time(selected.toISOString())} شروع شد.`);
      setEdited(false);
    } catch (error) { setError(error instanceof Error ? error.message : "ثبت بازه انجام نشد."); }
  }
  return <div className={s.workspace}>
    <Link href="/dashboard" className={s.back}><ArrowRight size={16} /> بازگشت به میز کار</Link>
    <header className={s.heading}><h1>حضور و غیاب</h1><span className={s.badge}>نسخهٔ اولیه</span></header>
    <section className={`${s.card} ${s.simpleRegistration}`} aria-labelledby="registration-heading">
      <div className={s.registrationRow}>
      <div className={s.simpleRegistrationHeading}><span className={s.registrationIcon} aria-hidden="true"><Clock3 size={23} strokeWidth={1.6} /></span><div><h2 id="registration-heading">ثبت ورود و خروج</h2><span className={s.registrationDate}>{now.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", weekday: "long", day: "numeric", month: "long" })}</span></div></div>
      <div className={s.registrationActionsArea}>
      <fieldset className={s.workModes}><legend>نوع کارکرد</legend><div className={s.workModeOptions}>{workModes.map(({ value, label, icon: Icon }) => <label key={value}><input type="radio" name="work-mode" value={value} checked={workMode === value} onChange={() => { setWorkMode(value); setError(""); setMessage(""); }} /><span><Icon size={14} />{label}</span></label>)}</div></fieldset>
      <div className={s.simpleRegistrationControls}>
        <TimePicker value={value} onChange={value => { setSelectedTime(value); setEdited(true); setError(""); setMessage(""); }} describedBy={error ? "registration-error" : "time-picker-hint"} />
        <div className={s.registrationButtons}><button type="button" className={s.entryAction} onClick={() => register("start")} disabled={workMode === "mission" ? !active || !!mission : !!mission || active?.mode === workMode}><LogIn size={17} />{active ? `شروع ${modeLabel(workMode)}` : `ورود · ${modeLabel(workMode)}`}</button><button type="button" className={s.exitAction} onClick={() => register("end", workMode === "mission" ? "mission" : active?.mode || workMode)} disabled={workMode === "mission" ? !mission : !active || !!mission}><LogOut size={17} />{workMode === "mission" ? "پایان مأموریت" : active ? `خروج ${modeLabel(active.mode)}` : "ثبت خروج"}</button></div>
      </div>
      </div>
      </div>
      <div className={s.registrationFooter}>
      <p id="time-picker-hint" className={s.registrationHint}><span className={`${s.registrationDot} ${today ? s.registrationDotActive : ""}`} aria-hidden="true" />{mission ? `مأموریت در کار ${modeLabel(active!.mode)} فعال است؛ قبل از خروج، مأموریت را پایان دهید.` : active ? workMode === "mission" ? `مأموریت داخل کار ${modeLabel(active.mode)} ثبت می‌شود و آن را نمی‌بندد.` : workMode !== active.mode ? `با شروع ${modeLabel(workMode)}، بازهٔ ${modeLabel(active.mode)} بسته می‌شود.` : `${modeLabel(active.mode)} از ${time(active.start)} فعال است.` : "ابتدا ورود عادی یا دورکاری را ثبت کنید."}</p>
      {error && <p id="registration-error" role="alert" className={s.entryError}>{error}</p>}
      {message && <p role="status" className={s.registrationFeedback}><Check size={14} />{message}</p>}
      {mission && <button type="button" className={s.returnFromMission} onClick={() => register("end", "mission")}>پایان مأموریت</button>}
      <span className={s.registrationPreview}>پیش‌نمایش · ذخیرهٔ موقت</span>
      </div>
      <TodayWorkTimeline day={today} currentTime={now.toISOString()} />
      {today && <div className={s.sessionList} aria-label="بازه‌های کار امروز">{today.sessions.map((session, index) => <div className={s.sessionItem} key={session.start + index}><span className={s.sessionMode} data-mode={session.mode}>{modeLabel(session.mode)}</span><span className={s.sessionTimes}>{time(session.start)}<span>←</span>{session.end ? time(session.end) : "اکنون"}</span><strong dir="ltr">{format(sessionMinutes([session], now.toISOString()))}</strong></div>)}</div>}
    </section>
    <TimesheetPreview name={name} currentTime={now.toISOString()} todayEntry={today} />
  </div>;
}
