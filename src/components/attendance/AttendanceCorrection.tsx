'use client';

import { useEffect, useId, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import { FilePlus2, X } from 'lucide-react';
import { getCorrectionDay } from "@/actions/attendance-history";
import type { AttendanceHistory } from "@/domain/attendance/history";
import { allClockTimes, tehranClock, persianClock } from "@/lib/clock-format";
import { requestWork, requestWorkInterval } from '@/actions/attendance-review';
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import { Select } from '@/components/ui/Select';
import { TimePicker } from './TimePicker';
import { AttendanceRequests } from './AttendanceRequests';
import type { TimeRequestSummary } from '@/types/attendance-review';
import { modeLabel, type WorkDay, type WorkMode } from '@/domain/attendance/work-sessions';
import s from './AttendanceWorkspace.module.css';
import modal from './TimePicker.module.css';

const clock = (stamp: string, locale = 'fa-IR') => locale === 'en-GB' ? tehranClock(stamp) : persianClock(stamp);
const nextDate = (date: string) => new Date(Date.parse(date + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
const stamp = (date: string, value: string) => new Date(`${date}T${value}:00+03:30`);
export function AttendanceCorrection({ days, now, requests, history, hasMoreRequests }: { days: WorkDay[]; now: string; requests: TimeRequestSummary[]; history: AttendanceHistory; hasMoreRequests: boolean }) {
  const [formOpen, setFormOpen] = useState(false);
  const formId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<'register' | 'correct' | 'mission' | 'late'>('register');
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState<WorkMode>('office');
  const [action, setAction] = useState<'both' | 'start' | 'end'>('both');
  const [nextDay, setNextDay] = useState(false);
  const [endNextDay, setEndNextDay] = useState(false);
  const [value, setValue] = useState(() => clock(now, 'en-GB'));
  const [endValue, setEndValue] = useState(() => clock(now, 'en-GB'));
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, startTransition] = useTransition();
  function close() {
    if (busy) return;
    dialog.current?.close();
    setFormOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    const element = dialog.current;
    if (!element || !formOpen) return;
    const viewport = window.visualViewport;
    function fitViewport() {
      if (!element) return;
      element.style.setProperty('--picker-vh', `${viewport?.height ?? window.innerHeight}px`);
      element.style.setProperty('--picker-vw', `${viewport?.width ?? document.documentElement.clientWidth}px`);
      element.style.setProperty('--picker-top', `${viewport?.offsetTop ?? 0}px`);
      element.style.setProperty('--picker-left', `${viewport?.offsetLeft ?? 0}px`);
    }
    fitViewport();
    if (!element.open) element.showModal();
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    viewport?.addEventListener('resize', fitViewport);
    viewport?.addEventListener('scroll', fitViewport);
    window.addEventListener('resize', fitViewport);
    return () => {
      viewport?.removeEventListener('resize', fitViewport);
      viewport?.removeEventListener('scroll', fitViewport);
      window.removeEventListener('resize', fitViewport);
      document.documentElement.style.overflow = previousOverflow;
      if (element.open) element.close();
    };
  }, [formOpen]);
  const existingDay = days.find(day => day.date === date);
  const [loadedDay, setLoadedDay] = useState<{ date: string; day: WorkDay | null; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!formOpen || existingDay) return;
    let cancelled = false;
    getCorrectionDay(date).then(day => {
      if (!cancelled) setLoadedDay({ date, day });
    }).catch(() => {
      if (!cancelled) setLoadedDay({ date, day: null, error: 'دریافت بازه‌های این روز انجام نشد.' });
    });
    return () => { cancelled = true; };
  }, [date, formOpen, existingDay, retry]);
  const resolved = loadedDay?.date === date ? loadedDay : null;
  const loadingDay = formOpen && !existingDay && !resolved;
  const day = existingDay ?? resolved?.day;
  const session = target === '' ? null : day?.sessions[Number(target)];
  const workSessions = day?.sessions.map((session, index) => ({ session, index })).filter(({ session }) => session.mode !== 'mission') ?? [];
  const pair = kind === 'mission' || (kind === 'register' && action === 'both');
  const timeDate = nextDay ? nextDate(date) : date;
  const endDate = endNextDay ? nextDate(timeDate) : timeDate;
  const [allowed, endAllowed] = useMemo(() => {
    if (!formOpen || kind === 'late') return [[], []];
    const current = Date.parse(now);
    const start = session ? Date.parse(session.start) : 0;
    const end = session?.end ? Date.parse(session.end) : current;
    function allowedFor(dayDate: string) {
      const midnight = stamp(dayDate, '00:00').getTime();
      return allClockTimes.filter((_, minute) => {
        const at = midnight + minute * 60000;
        return at <= current && (kind !== 'mission' || !!session && session.mode !== 'mission' && at >= start && at <= end);
      });
    }
    return [allowedFor(timeDate), pair ? allowedFor(endDate) : []];
  }, [formOpen, kind, now, session, timeDate, endDate, pair]);
  function selectKind(value: typeof kind) {
    setKind(value); setTarget(''); setAction(value === 'correct' ? 'start' : 'both'); setNextDay(false); setEndNextDay(false); setFeedback(null);
  }
  function selectTarget(value: string) {
    setTarget(value); setFeedback(null);
    const selected = day?.sessions[Number(value)];
    if (kind === 'mission' && selected) {
      setValue(clock(selected.start, 'en-GB')); setEndValue(clock(selected.end ?? now, 'en-GB'));
      const startDate = new Date(selected.start).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
      const finishDate = new Date(selected.end ?? now).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
      setNextDay(startDate !== date); setEndNextDay(finishDate !== startDate);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFeedback(null);
    const fail = (message: string) => setFeedback({ ok: false, message });
    if (reason.trim().length < 5 || reason.trim().length > 2000) { fail('دلیل درخواست را در ۵ تا ۲۰۰۰ نویسه بنویسید.'); return; }
    if ((kind === 'correct' || kind === 'mission') && !session) { fail('بازهٔ ثبت‌شدهٔ موردنظر را انتخاب کنید.'); return; }
    if (kind === 'mission' && session?.mode === 'mission') { fail('مأموریت باید داخل بازهٔ کاری عادی یا دورکاری باشد.'); return; }
    if (kind !== 'late' && (!allowed.includes(value) || pair && !endAllowed.includes(endValue))) { fail('ساعت معتبر انتخاب کنید؛ ساعت آینده یا مأموریت خارج از بازهٔ کار مجاز نیست.'); return; }
    const at = stamp(timeDate, value), until = stamp(endDate, endValue);
    if (pair && until <= at) { fail('ساعت پایان باید بعد از ساعت شروع باشد.'); return; }
    startTransition(async () => {
      try {
        const result = pair ? await requestWorkInterval({ date, mode: kind === 'mission' ? 'mission' : mode, at: at.toISOString(), until: until.toISOString(), reason })
          : await requestWork({ date, kind: kind === 'late' ? 'late' : 'time', action: action === 'end' ? 'end' : 'start', mode: kind === 'correct' ? session!.mode : mode,
            at: kind === 'late' ? null : at.toISOString(), index: kind === 'correct' ? Number(target) : null, reason });
        setFeedback(result);
        if (result.ok) setReason('');
      } catch { fail('ارسال درخواست انجام نشد؛ دوباره تلاش کنید.'); }
    });
  }
  const missingWork = kind === 'mission' && !workSessions.length;
  return <section className={`${s.card} ${s.correctionCard}`} aria-label="درخواست ثبت یا اصلاح تردد">
    <button ref={trigger} type="button" className={s.correctionButton} aria-haspopup="dialog" aria-expanded={formOpen} aria-controls={`${formId}-dialog`} onClick={() => { setFeedback(null); setFormOpen(true); }}>
      <FilePlus2 size={20} aria-hidden="true" /><span>ثبت یا اصلاح تردد</span>
    </button>
    <dialog ref={dialog} id={`${formId}-dialog`} className={`${modal.panel} ${s.correctionModal}`} dir="rtl" aria-labelledby={`${formId}-title`} aria-describedby={`${formId}-hint`}
      onCancel={event => { event.preventDefault(); close(); }} onClose={() => { if (!dialog.current?.open) setFormOpen(false); }}>
      {formOpen && <><header className={modal.dialogHeader}>
        <span className={modal.dialogIcon} aria-hidden="true"><FilePlus2 size={20} /></span>
        <div><h2 id={`${formId}-title`}>ثبت یا اصلاح تردد</h2><p>درخواست ثبت، اصلاح ساعت یا مأموریت</p></div>
        <button type="button" className={modal.close} disabled={busy} aria-label="بستن فرم ثبت یا اصلاح تردد" onClick={close}><X size={19} /></button>
      </header>
      <form id={formId} className={s.correctionModalForm} onSubmit={submit}>
      <div className={s.correctionForm}>
        <p id={`${formId}-hint`} className={s.registrationHint}>درخواست را برای مدیریت بفرستید؛ ساعت‌ها پس از تأیید در کارکرد ثبت می‌شوند. پاسخ را در تاریخچه مکاتبات ببینید.</p>
        <JalaliDatePicker value={date} max={today} disabled={busy} onChange={date => { setDate(date); setTarget(''); setNextDay(false); setEndNextDay(false); setFeedback(null); }} />
        <label>درخواست موردنظر<Select aria-label="درخواست موردنظر" value={kind} disabled={busy} onChange={event => selectKind(event.target.value as typeof kind)}><option value="register">ثبت ورود و خروج جاافتاده</option><option value="correct">اصلاح ساعت ورود یا خروج</option><option value="mission" disabled={!workSessions.length}>ثبت مأموریت</option><option value="late">فقط توضیح تأخیر</option></Select></label>
        {!workSessions.length && <p className={s.registrationHint}>ثبت مأموریت پس از ثبت ساعت کاری این روز فعال می‌شود.</p>}
        {(kind === 'correct' || kind === 'mission') && <label>{kind === 'mission' ? 'بازهٔ کاری مأموریت' : 'بازهٔ موردنظر'}<Select aria-label="بازهٔ ثبت‌شده" value={target} disabled={busy} required onChange={event => selectTarget(event.target.value)}><option value="">انتخاب بازهٔ ثبت‌شده</option>{(kind === 'mission' ? workSessions : day?.sessions.map((session, index) => ({ session, index })) ?? []).map(({ session, index }) => <option key={index} value={index}>{modeLabel(session.mode)} · {clock(session.start)} تا {session.end ? clock(session.end) : 'خروج ثبت‌نشده'}</option>)}</Select></label>}
        {kind === 'register' && <label>نوع کارکرد<Select aria-label="نوع کارکرد" value={mode} disabled={busy} onChange={event => setMode(event.target.value as WorkMode)}><option value="office">عادی</option><option value="remote">دورکاری</option></Select></label>}
        {(kind === 'register' || kind === 'correct') && <label>ساعت موردنظر<Select aria-label="ورود یا خروج" value={action} disabled={busy} onChange={event => setAction(event.target.value as typeof action)}>{kind === 'register' && <option value="both">ورود و خروج با هم</option>}<option value="start">{kind === 'correct' ? 'اصلاح ورود' : 'فقط ورود'}</option><option value="end">{kind === 'correct' ? 'اصلاح خروج' : 'فقط خروج'}</option></Select></label>}
        {kind !== 'late' && <>
          <label className={s.correctionCheck}><input type="checkbox" checked={nextDay} disabled={busy} onChange={event => setNextDay(event.target.checked)} />{pair ? 'شروع بازه در روز بعد (شیفت شب)' : 'ساعت روز بعد برای شیفت شب'}</label>
          <TimePicker label={pair ? kind === 'mission' ? 'شروع مأموریت' : 'ساعت ورود' : 'ساعت موردنظر'} value={value} allowedTimes={allowed.length ? allowed : [value]} disabled={busy || !allowed.length} requestMode onChange={setValue} />
          {pair && <><label className={s.correctionCheck}><input type="checkbox" checked={endNextDay} disabled={busy} onChange={event => setEndNextDay(event.target.checked)} />پایان بازه در روز بعد از شروع</label><TimePicker label={kind === 'mission' ? 'پایان مأموریت' : 'ساعت خروج'} value={endValue} allowedTimes={endAllowed.length ? endAllowed : [endValue]} disabled={busy || !endAllowed.length} requestMode onChange={setEndValue} /></>}
          {kind === 'mission' && <p className={s.registrationHint}>شروع و پایان مأموریت باید داخل بازهٔ کاری انتخاب‌شده باشند؛ مدت کار اصلی دوباره محاسبه نمی‌شود.</p>}
        </>}
        <label>دلیل درخواست<textarea value={reason} disabled={busy} onChange={event => setReason(event.target.value)} minLength={5} maxLength={2000} rows={3} required placeholder="دلیل ثبت یا اصلاح ساعت را بنویسید." /></label>
        {feedback && <p role={feedback.ok ? 'status' : 'alert'} className={feedback.ok ? s.registrationFeedback : s.entryError}>{feedback.message}</p>}
      </div>
      {loadingDay && <p role="status">در حال دریافت بازه‌های این روز…</p>}
      {resolved?.error && <p role="alert">{resolved.error} <button type="button" onClick={() => setRetry(value => value + 1)}>تلاش دوباره</button></p>}
      <footer className={modal.dialogFooter}><button type="submit" className={modal.done} disabled={busy || missingWork || loadingDay || !!resolved?.error}>{busy ? 'در حال ارسال…' : 'ارسال درخواست به مدیریت'}</button></footer>
      </form></>}
    </dialog>
    <AttendanceRequests requests={requests} history={history} hasMore={hasMoreRequests} />
  </section>;
}
