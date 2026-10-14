"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Clock3, X } from "lucide-react";
import { MagneticTimeWheel } from "./MagneticTimeWheel";
import s from "./TimePicker.module.css";

const two = (value: number) => String(value).padStart(2, "0");
const fa = (value: string) => value.replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export function TimePicker({ value, onChange, allowedTimes, disabled = false, describedBy, requestMode = false, onRequestModeChange, requestFields, hint, label = "ساعت", showLabel = true, onCurrentTime }: {
  value: string; onChange: (value: string) => void; allowedTimes: string[]; disabled?: boolean; describedBy?: string;
  hint?: string; requestMode?: boolean; onRequestModeChange?: (checked: boolean) => void; requestFields?: ReactNode; label?: string; showLabel?: boolean;
  onCurrentTime?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const displayValue = allowedTimes.includes(value) ? value : allowedTimes.at(-1)!;
  const [hour = "00", minute = "00"] = displayValue.split(":");
  const hours = useMemo(() => open ? [...new Set(allowedTimes.map(time => Number(time.slice(0, 2))))] : [], [allowedTimes, open]);
  const minutes = useMemo(() => open ? allowedTimes.filter(time => time.startsWith(`${hour}:`)).map(time => Number(time.slice(3))) : [], [allowedTimes, hour, open]);
  function selectHour(nextHour: number) {
    const times = allowedTimes.filter(time => time.startsWith(`${two(nextHour)}:`));
    const nearest = times.reduce((best, next) => Math.abs(Number(next.split(":")[1]) - Number(minute)) < Math.abs(Number(best.split(":")[1]) - Number(minute)) ? next : best);
    onChange(nearest);
  }
  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open || disabled) return;
    const viewport = window.visualViewport;
    function fitViewport() {
      if (!element) return;
      element.style.setProperty("--picker-vh", `${viewport?.height ?? window.innerHeight}px`);
      element.style.setProperty("--picker-vw", `${viewport?.width ?? document.documentElement.clientWidth}px`);
      element.style.setProperty("--picker-top", `${viewport?.offsetTop ?? 0}px`);
      element.style.setProperty("--picker-left", `${viewport?.offsetLeft ?? 0}px`);
    }
    fitViewport();
    // Native modal top layer avoids clipping and stacking contexts in the portal shell.
    if (!element.open) element.showModal();
    const bodyElement = body.current;
    const contentElement = content.current;
    function fitContent() {
      if (bodyElement && contentElement) bodyElement.style.height = `${contentElement.getBoundingClientRect().height}px`;
    }
    fitContent();
    const observer = new ResizeObserver(fitContent);
    if (contentElement) observer.observe(contentElement);
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      bodyElement?.setAttribute("data-resize-ready", "true");
      const wheel = element.querySelector<HTMLElement>('[role="spinbutton"]');
      wheel?.focus({ preventScroll: true });
    });
    viewport?.addEventListener("resize", fitViewport);
    viewport?.addEventListener("scroll", fitViewport);
    window.addEventListener("resize", fitViewport);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      bodyElement?.removeAttribute("data-resize-ready");
      bodyElement?.style.removeProperty("height");
      viewport?.removeEventListener("resize", fitViewport);
      viewport?.removeEventListener("scroll", fitViewport);
      window.removeEventListener("resize", fitViewport);
      document.documentElement.style.overflow = previousOverflow;
      if (element.open) element.close();
    };
  }, [open, disabled]);
  return <div className={s.picker}>
    <span id={`${id}-label`} className={showLabel ? s.label : s.hiddenLabel}>{label}</span>
    <button ref={trigger} type="button" className={s.trigger} disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-describedby={describedBy} aria-haspopup="dialog" aria-expanded={open && !disabled} aria-controls={`${id}-panel`} onClick={() => setOpen(true)}><Clock3 size={17} /><strong id={`${id}-value`} dir="ltr">{fa(value)}</strong><ChevronDown size={15} className={open ? s.rotated : ""} /></button>
    <dialog ref={dialog} id={`${id}-panel`} className={s.panel} dir="rtl" aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint`}
      onCancel={event => { event.preventDefault(); close(); }}
      onClose={() => { if (!dialog.current?.open) setOpen(false); }}>
      {open && <><header className={s.dialogHeader}>
        <span className={s.dialogIcon} aria-hidden="true"><Clock3 size={20} /></span>
        <div><h2 id={`${id}-title`}>{requestMode ? "ساعت درخواستی" : "انتخاب ساعت"}</h2><p>به وقت تهران</p></div>
        <button type="button" className={s.close} aria-label="بستن انتخاب‌گر ساعت" onClick={close}><X size={19} /></button>
      </header>
      <div ref={body} className={`${s.dialogBody} ${s.resizingBody}`}>
      <div ref={content} className={s.dialogContent}>
        <div className={s.magneticColumns} dir="ltr"><MagneticTimeWheel title="ساعت" count={24} values={hours} value={Number(hour)} onChange={selectHour} /><span className={s.wheelSeparator}>:</span><MagneticTimeWheel title="دقیقه" count={60} values={minutes} value={Number(minute)} onChange={minute => onChange(`${hour}:${two(minute)}`)} /></div>
        {onCurrentTime && <button className={s.currentTime} type="button" disabled={disabled} onClick={onCurrentTime}><Clock3 size={14} />ساعت فعلی</button>}
        <p id={`${id}-hint`} className={s.limitHint}>{hint ?? (requestMode ? "این ساعت پس از تأیید مدیریت اعمال می‌شود." : "از ۱۵ دقیقهٔ گذشته تا همین لحظه")}</p>
        {onRequestModeChange && <label className={`${s.requestToggle} ${requestMode ? s.requestEnabled : ""}`}><input type="checkbox" checked={requestMode} onChange={event => onRequestModeChange(event.target.checked)} aria-controls={`${id}-request`} /><span><strong>ثبت ساعت با تأیید مدیریت</strong><small>درخواست ساعت امروز خارج از بازهٔ ۱۵ دقیقه</small></span></label>}
        <div id={`${id}-request`} className={s.requestReveal} data-open={requestMode} inert={!requestMode} aria-hidden={!requestMode}>
          <div className={s.requestRevealInner}><div className={s.requestFields}>{requestFields}</div></div>
        </div>
      </div>
      </div>
      <footer className={s.dialogFooter}>
        <button className={s.done} type="button" onClick={() => { onChange(displayValue); close(); }}><Check size={17} />{requestMode ? "انتخاب ساعت و ادامهٔ درخواست" : "انتخاب ساعت"}</button>
      </footer></>}
    </dialog>
  </div>;
}
