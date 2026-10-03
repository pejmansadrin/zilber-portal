"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Clock3 } from "lucide-react";
import { MagneticTimeWheel } from "./MagneticTimeWheel";
import s from "./TimePicker.module.css";

const two = (value: number) => String(value).padStart(2, "0");
const fa = (value: string) => value.replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export function TimePicker({ value, onChange, disabled = false, describedBy }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [hour = "00", minute = "00"] = value.split(":");
  useEffect(() => {
    if (!open || disabled) return;
    const frame = requestAnimationFrame(() => {
      root.current?.querySelector<HTMLElement>('[role="spinbutton"]')?.focus({ preventScroll: true });
    });
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, disabled, id]);
  return <div className={s.picker} ref={root} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <span id={`${id}-label`} className={s.label}>ساعت · تهران</span>
    <button ref={trigger} type="button" className={s.trigger} disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-describedby={describedBy} aria-haspopup="dialog" aria-expanded={open && !disabled} aria-controls={`${id}-panel`} onClick={() => setOpen(!open)}><Clock3 size={17} /><strong id={`${id}-value`} dir="ltr">{fa(value)}</strong><ChevronDown size={15} className={open ? s.rotated : ""} /></button>
    <input className={s.mobileInput} type="time" step="60" value={value} onChange={event => onChange(event.target.value)} disabled={disabled} aria-labelledby={`${id}-label`} aria-describedby={describedBy} />
    {open && !disabled && <div id={`${id}-panel`} className={s.panel} role="dialog" aria-label="انتخاب ساعت و دقیقه">
      <div className={s.magneticColumns} dir="ltr"><MagneticTimeWheel title="ساعت" count={24} value={Number(hour)} onChange={hour => onChange(`${two(hour)}:${minute}`)} /><span className={s.wheelSeparator}>:</span><MagneticTimeWheel title="دقیقه" count={60} value={Number(minute)} onChange={minute => onChange(`${hour}:${two(minute)}`)} /></div>
      <button className={s.done} type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}><Check size={16} />انتخاب ساعت</button>
    </div>}
  </div>;
}
