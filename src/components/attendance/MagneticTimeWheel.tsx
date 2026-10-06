"use client";

import { useEffect, useRef } from "react";
import s from "./TimePicker.module.css";

const fa = (number: number) => String(number).padStart(2, "0").replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export function MagneticTimeWheel({ title, count, values, value, onChange }: {
  title: string; count: number; values?: number[]; value: number; onChange: (value: number) => void;
}) {
  const options = values || Array.from({ length: count }, (_, number) => number);
  const wheel = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ pointerId: number; startY: number; lastY: number; moved: boolean; tapped: number | null } | null>(null);
  const latest = useRef({ value, onChange, options });
  useEffect(() => { latest.current = { value, onChange, options }; });
  useEffect(() => {
    const element = wheel.current;
    if (!element) return;
    let lastTime = 0;
    let direction = 0;
    let burst = 0;
    let accumulated = 0;
    function handleWheel(event: WheelEvent) {
      if (event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      const sign = Math.sign(event.deltaY);
      const gap = event.timeStamp - lastTime;
      if (gap > 160 || sign !== direction) { burst = 0; accumulated = 0; }
      burst++; direction = sign; lastTime = event.timeStamp;
      // Normalize mouse notches and accumulate small trackpad movements.
      const delta = Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 170 : 1);
      accumulated += Math.min(delta, 40);
      if (accumulated < 24) return;
      accumulated = 0;
      const step = burst >= 3 && gap < 35 ? 3 : burst >= 3 && gap < 75 ? 2 : 1;
      const choices = latest.current.options;
      const index = choices.indexOf(latest.current.value);
      const next = choices[Math.max(0, Math.min(choices.length - 1, index + sign * step))];
      latest.current.value = next;
      latest.current.onChange(next);
    }
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [count]);
  const select = (index: number) => onChange(options[Math.max(0, Math.min(options.length - 1, index))]);
  return <div className={s.wheelColumn}>
    <span className={s.wheelTitle}>{title}</span>
    <div ref={wheel} className={s.wheel} role="spinbutton" tabIndex={0} aria-label={title} aria-valuemin={Math.min(...options)} aria-valuemax={Math.max(...options)} aria-valuenow={value} aria-valuetext={fa(value)} onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0) return;
      const number = (event.target as HTMLElement).closest<HTMLElement>('[data-index]');
      gesture.current = { pointerId: event.pointerId, startY: event.clientY, lastY: event.clientY, moved: false, tapped: number ? Number(number.dataset.index) : null };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus({ preventScroll: true });
    }} onPointerMove={event => {
      const drag = gesture.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (Math.abs(event.clientY - drag.startY) > 6) drag.moved = true;
      const steps = Math.trunc((drag.lastY - event.clientY) / 34);
      if (!steps) return;
      drag.lastY -= steps * 34;
      const current = latest.current;
      const index = current.options.indexOf(current.value);
      const next = current.options[Math.max(0, Math.min(current.options.length - 1, index + steps))];
      if (next !== undefined && next !== current.value) { current.value = next; current.onChange(next); }
    }} onPointerUp={event => {
      const drag = gesture.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.moved && drag.tapped !== null) select(drag.tapped);
      gesture.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }} onPointerCancel={() => { gesture.current = null; }} onLostPointerCapture={() => { gesture.current = null; }} onKeyDown={event => {
      const index = options.indexOf(value);
      const next = event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" ? index + 1 : event.key === "PageUp" ? index - 5 : event.key === "PageDown" ? index + 5 : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : null;
      if (next !== null) { event.preventDefault(); select(next); }
    }}>
      <div className={s.magnetBand} aria-hidden="true" />
      <div className={s.wheelTrack} aria-hidden="true">{options.map((number, index) => {
        const distance = index - options.indexOf(value);
        const angle = Math.max(-90, Math.min(90, distance * 27));
        const radians = angle * Math.PI / 180;
        const scale = Math.max(.48, 1 - Math.abs(distance) * .19);
        return <div key={number} data-index={index} className={`${s.wheelNumber} ${number === value ? s.wheelSelected : ""}`} style={{
          transform: `translateY(${Math.sin(radians) * 68}px) translateZ(${(Math.cos(radians) - 1) * 68}px) rotateX(${-angle}deg) scale(${scale})`,
          opacity: Math.abs(distance) > 3 ? 0 : Math.max(.15, 1 - Math.abs(distance) * .28),
          visibility: Math.abs(distance) > 3 ? "hidden" : "visible",
        }}>{fa(number)}</div>;
      })}</div>
    </div>
  </div>;
}
