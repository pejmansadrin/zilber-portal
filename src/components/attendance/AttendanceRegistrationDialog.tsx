"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Clock3, X } from "lucide-react";
import { modeLabel, type WorkMode } from "@/domain/attendance/work-sessions";
import s from "./TimePicker.module.css";

type Pending = { date: string; at: string; future: boolean; warning: boolean; action: "start" | "end"; mode: WorkMode };

export function AttendanceRegistrationDialog({ pending, busy, error, onClose, onCorrect, onConfirm, onRequest }: {
  pending: Pending | null; busy: boolean; error: string;
  onClose: () => void; onCorrect: () => void; onConfirm: () => void; onRequest: (reason: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  useEffect(() => {
    const element = dialog.current;
    if (!pending || !element) return;
    if (!element.open) element.showModal();
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      element.close();
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [pending]);
  if (!pending) return null;
  const future = pending.future;
  const clock = new Date(pending.at).toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!future && !busy && reason.trim().length >= 5 && reason.trim().length <= 2000) onRequest(reason.trim());
  }
  return <dialog ref={dialog} className={s.panel} dir="rtl" aria-labelledby="registration-dialog-title" aria-describedby="registration-dialog-description"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClose={() => { if (!busy) onClose(); }}>
    <header className={s.dialogHeader}>
      <span className={s.dialogIcon}><Clock3 size={20} /></span>
      <div><h2 id="registration-dialog-title">{pending.warning ? "هشدار ثبت خروج زودتر" : "ساعت خارج از بازهٔ امن"}</h2><p>{pending.action === "start" ? "ورود" : "خروج"} {modeLabel(pending.mode)} · {clock}</p></div>
      <button type="button" className={s.close} disabled={busy} onClick={onClose} aria-label="بستن پنجره"><X size={19} /></button>
    </header>
    <form onSubmit={submit} className={s.requestForm}>
      <div className={s.dialogBody}>
        <p id="registration-dialog-description" className={s.limitHint}>{future
          ? "ساعت انتخاب‌شده در آینده است. ساعت را اصلاح کنید؛ ثبت یا درخواست ساعت آینده مجاز نیست."
          : pending.warning ? "دارید ساعت خروجی زودتر از بازهٔ ۱۵ دقیقهٔ گذشته ثبت می‌کنید. کارکرد شما تا همین ساعت محاسبه خواهد شد. از ثبت این ساعت مطمئن هستید؟" : "ساعت انتخاب‌شده خارج از بازهٔ امن ۱۵ دقیقهٔ گذشته است. ساعت را اصلاح کنید یا برای ثبت همین ساعت، درخواست تأیید به مدیر بفرستید."}</p>
        <button type="button" className={s.done} disabled={busy} onClick={onCorrect}>اصلاح ساعت به زمان فعلی</button>
        {!future && !pending.warning && <div className={s.requestFields}>
          <label>دلیل درخواست<textarea value={reason} disabled={busy} onChange={event => setReason(event.target.value)} minLength={5} maxLength={2000} required rows={3} placeholder="علت ثبت این ساعت ورود یا خروج را بنویسید." /></label>
          <p>تا تأیید مدیر، ساعت ورود و خروج و کارکرد شما تغییر نمی‌کند.</p>
        </div>}
        {error && <p role="alert" className={s.limitHint}>{error}</p>}
      </div>
      {pending.warning && <footer className={s.dialogFooter}><button type="button" className={s.done} disabled={busy} onClick={onConfirm}>{busy ? "در حال ثبت…" : "تأیید و ثبت خروج با همین ساعت"}</button></footer>}
      {!future && !pending.warning && <footer className={s.dialogFooter}><button type="submit" className={s.done} disabled={busy || reason.trim().length < 5}>{busy ? "در حال ارسال…" : "ارسال درخواست به مدیر"}</button></footer>}
    </form>
  </dialog>;
}
