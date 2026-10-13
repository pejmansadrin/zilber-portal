"use client";


import { useEffect, useState, useTransition } from "react";
import { Clock3, Check, Building2, Laptop, BriefcaseBusiness, LogIn, LogOut } from "lucide-react";
import s from "./AttendanceWorkspace.module.css";
import { registerWork, requestWork, closePendingWork } from '@/actions/attendance-review';
import { AttendanceRegistrationDialog } from "./AttendanceRegistrationDialog";
import type { TimeRequest } from '@/types/attendance-review';
import { TodayWorkTimeline } from "./TodayWorkTimeline";
import { TimePicker } from "./TimePicker";
import { AttendanceCorrection } from "./AttendanceCorrection";
import { registrationDecision } from "@/domain/attendance/registration-time";
import { TimesheetPreview } from "./TimesheetPreview";

import { sessionMinutes, modeLabel, type WorkMode, type WorkDay } from "@/domain/attendance/work-sessions";
import { format } from "./timesheet-data";
const workModes = [{ value: "office", label: "عادی", icon: Building2 }, { value: "remote", label: "دورکاری", icon: Laptop }, { value: "mission", label: "مأموریت", icon: BriefcaseBusiness }] as const;
const time = (stamp: string) => new Date(stamp).toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false });
const localTime = (stamp: string) => new Date(stamp).toLocaleTimeString("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false });

export function AttendanceWorkspace({ initialTime, name, days, requests }: { initialTime: string; name: string; days: WorkDay[]; requests: TimeRequest[] }) {
  const [now, setNow] = useState(() => new Date(initialTime));
  const [busy, startTransition] = useTransition();
  const workDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const today = days.find(day => day.sessions.some(session => session.mode !== "mission" && !session.end)) || days.find(day => day.date === workDate) || null;
  const active = today?.sessions.find(session => session.mode !== "mission" && !session.end);
  const pendingEntry = !active ? requests.find(request => request.status === "pending" && request.kind === "time" && request.action === "start" && request.mode !== "mission" && request.session_index === null && request.requested_at && !request.requested_until) : undefined;
  const mission = today?.sessions.find(session => session.mode === "mission" && !session.end);
  const [workMode, setWorkMode] = useState<WorkMode>("office");
  const [selectedTime, setSelectedTime] = useState(() => localTime(initialTime));
  const [edited, setEdited] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{ date: string; at: string; future: boolean; warning: boolean; action: "start" | "end"; mode: WorkMode } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const value = edited ? selectedTime : localTime(now.toISOString());
  const allowedTimes = Array.from({ length: 1440 }, (_, minute) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  function register(action: "start" | "end", nextMode = workMode, confirmedAt?: string) {
    setError(""); setMessage("");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) { setError("ساعت را وارد کنید."); return; }
    const stamp = new Date();
    try {
      const date = stamp.toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
      const selected = confirmedAt ? new Date(confirmedAt) : edited ? new Date(`${date}T${value}:00+03:30`) : stamp;
      const target = nextMode === "mission" ? mission : active;
      const decision = registrationDecision(selected.toISOString(), stamp.toISOString(), action, target?.start || (action === "end" ? pendingEntry?.requested_at ?? undefined : undefined));
      if (decision === "request" || decision === "warning" && !confirmedAt) {
        setRequestError("");
        setPendingRequest({ date, at: selected.toISOString(), future: false, warning: decision === "warning", action, mode: nextMode });
        return;
      }
      startTransition(async () => {
        try {
          const result = action === "end" && nextMode !== "mission" && pendingEntry
            ? await closePendingWork({ id: pendingEntry.id, at: selected.toISOString(), acknowledgeEarlyExit: !!confirmedAt })
            : await registerWork({ at: selected.toISOString(), action, mode: nextMode, acknowledgeEarlyExit: !!confirmedAt });
          if (!result.ok) { setPendingRequest(null); setError(result.message); return; }
          if (action === "start") setWorkMode(nextMode);
          setMessage(result.message); setEdited(false); setPendingRequest(null);
        } catch { if (confirmedAt) setRequestError("ثبت انجام نشد؛ دوباره تلاش کنید."); else setError("ثبت انجام نشد؛ دوباره تلاش کنید."); }
      });
    } catch (error) { setError(error instanceof Error ? error.message : "ثبت بازه انجام نشد."); }
  }
  return <div className={s.workspace}>
        <header className={s.heading}><h1>حضور و غیاب</h1><span className={s.badge}>ثبت و پیگیری تردد</span></header>
    <section className={`${s.card} ${s.simpleRegistration}`} aria-labelledby="registration-heading">
      <div className={s.registrationRow}>
      <div className={s.simpleRegistrationHeading}><span className={s.registrationIcon} aria-hidden="true"><Clock3 size={23} strokeWidth={1.6} /></span><div><h2 id="registration-heading">ثبت ورود و خروج</h2><span className={s.registrationDate}>{now.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", weekday: "long", day: "numeric", month: "long" })}</span></div></div>
      <div className={s.registrationActionsArea}>
      <fieldset className={s.workModes}><legend>نوع کارکرد</legend><div className={s.workModeOptions}>{workModes.map(({ value, label, icon: Icon }) => <label key={value}><input type="radio" name="work-mode" value={value} checked={workMode === value} disabled={busy} onChange={() => { setWorkMode(value); setError(""); setMessage(""); }} /><span><Icon size={14} />{label}</span></label>)}</div></fieldset>
      <div className={s.simpleRegistrationControls}>
        <div className={s.registrationTime}>
        <TimePicker allowedTimes={allowedTimes} value={value} disabled={busy} showLabel={false}
          hint="ورود: تا ۱۵ دقیقه قبل؛ خروج: تا ۱۵ دقیقه قبل یا بعد از اکنون. ساعت قدیمی‌تر هنگام ثبت بررسی می‌شود."
          onChange={value => { setSelectedTime(value); setEdited(value !== localTime(new Date().toISOString())); setError(""); setMessage(""); }}
          describedBy={error ? "registration-error" : "time-picker-hint"}
          onCurrentTime={edited ? () => {
          const current = new Date();
          setNow(current); setSelectedTime(localTime(current.toISOString())); setEdited(false); setError(""); setMessage("");
        } : undefined} />
        </div>
        <div className={s.registrationButtons}><button type="button" className={s.entryAction} onClick={() => register("start")} disabled={busy || (workMode === "mission" ? !active || !!mission : !!pendingEntry || !!mission || active?.mode === workMode)}><LogIn size={17} />{active ? `شروع ${modeLabel(workMode)}` : `ورود · ${modeLabel(workMode)}`}</button><button type="button" className={s.exitAction} onClick={() => register("end", workMode === "mission" ? "mission" : active?.mode || pendingEntry?.mode || workMode)} disabled={busy || (workMode === "mission" ? !mission : (!active && !pendingEntry) || !!mission)}><LogOut size={17} />{workMode === "mission" ? "پایان مأموریت" : active ? `خروج ${modeLabel(active.mode)}` : pendingEntry ? "ثبت خروج ورودِ منتظر تأیید" : "ثبت خروج"}</button></div>
      </div>
      </div>
      </div>
      <div className={s.registrationFooter}>
      <p id="time-picker-hint" className={s.registrationHint}><span className={`${s.registrationDot} ${today ? s.registrationDotActive : ""}`} aria-hidden="true" />{mission ? `مأموریت در کار ${modeLabel(active!.mode)} فعال است؛ قبل از خروج، مأموریت را پایان دهید.` : active ? workMode === "mission" ? `مأموریت داخل کار ${modeLabel(active.mode)} ثبت می‌شود و آن را نمی‌بندد.` : workMode !== active.mode ? `با شروع ${modeLabel(workMode)}، بازهٔ ${modeLabel(active.mode)} بسته می‌شود.` : `${modeLabel(active.mode)} از ${time(active.start)} فعال است.` : pendingEntry ? `ورود ${time(pendingEntry.requested_at!)} منتظر تأیید مدیر است؛ می‌توانید خروج را ثبت کنید. کارکرد پس از تأیید محاسبه می‌شود.` : "ابتدا ورود عادی یا دورکاری را ثبت کنید."}</p>
      {error && <p id="registration-error" role="alert" className={s.entryError}>{error}</p>}
      {message && <p role="status" className={s.registrationFeedback}><Check size={14} />{message}</p>}
      {mission && <button type="button" className={s.returnFromMission} disabled={busy} onClick={() => register("end", "mission")}>پایان مأموریت</button>}
      </div>
      <TodayWorkTimeline day={today} currentTime={now.toISOString()} />
      {today && <div className={s.sessionList} aria-label="بازه‌های کار امروز">{today.sessions.map((session, index) => <div className={s.sessionItem} key={session.start + index}><span className={s.sessionMode} data-mode={session.mode}>{modeLabel(session.mode)}</span><span className={s.sessionTimes}>{time(session.start)}<span>←</span>{session.end ? time(session.end) : "اکنون"}</span><strong dir="ltr">{format(sessionMinutes([session], now.toISOString()))}</strong></div>)}</div>}
    </section>
    <AttendanceRegistrationDialog key={pendingRequest?.at ?? "closed"} pending={pendingRequest} busy={busy} error={requestError} onClose={() => setPendingRequest(null)}
      onConfirm={() => { if (pendingRequest) register(pendingRequest.action, pendingRequest.mode, pendingRequest.at); }}
      onCorrect={() => { setPendingRequest(null); setEdited(false); setError(""); }}
      onRequest={reason => {
        if (!pendingRequest) return;
        const request = pendingRequest;
        startTransition(async () => {
          try {
            const result = await requestWork({ ...request, kind: "time", index: null, reason });
            if (!result.ok) { setRequestError(result.message); return; }
            setMessage(result.message); setPendingRequest(null); setEdited(false);
            return;
          } catch { setRequestError("ارسال درخواست انجام نشد؛ دوباره تلاش کنید."); }
        });
      }} />
    <AttendanceCorrection days={days} now={now.toISOString()} requests={requests} />
    <TimesheetPreview name={name} currentTime={now.toISOString()} todayEntry={today} workDays={days} />
  </div>;
}
