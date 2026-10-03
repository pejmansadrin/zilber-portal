"use client";

import { useEffect, useRef } from "react";
import s from "./TimePicker.module.css";

const fa = (number: number) => String(number).padStart(2, "0").replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export function MagneticTimeWheel({ title, count, value, onChange }: {
  title: string; count: number; value: number; onChange: (value: number) => void;
}) {
  const wheel = useRef<HTMLDivElement>(null);
  const latest = useRef({ value, onChange });
  useEffect(() => { latest.current = { value, onChange }; }, [value, onChange]);
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
      const next = Math.max(0, Math.min(count - 1, latest.current.value + sign * step));
      latest.current.value = next;
      latest.current.onChange(next);
    }
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [count]);
  const select = (next: number) => onChange(Math.max(0, Math.min(count - 1, next)));
  return <div className={s.wheelColumn}>
    <span className={s.wheelTitle}>{title}</span>
    <div ref={wheel} className={s.wheel} role="spinbutton" tabIndex={0} aria-label={title} aria-valuemin={0} aria-valuemax={count - 1} aria-valuenow={value} aria-valuetext={fa(value)} onKeyDown={event => {
      const next = event.key === "ArrowUp" ? value - 1 : event.key === "ArrowDown" ? value + 1 : event.key === "PageUp" ? value - 5 : event.key === "PageDown" ? value + 5 : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : null;
      if (next !== null) { event.preventDefault(); select(next); }
    }}>
      <div className={s.magnetBand} aria-hidden="true" />
      <div className={s.wheelTrack} aria-hidden="true">{Array.from({ length: count }, (_, number) => {
        const distance = number - value;
        const angle = Math.max(-90, Math.min(90, distance * 27));
        const radians = angle * Math.PI / 180;
        const scale = Math.max(.48, 1 - Math.abs(distance) * .19);
        return <div key={number} className={`${s.wheelNumber} ${number === value ? s.wheelSelected : ""}`} style={{
          transform: `translateY(${Math.sin(radians) * 68}px) translateZ(${(Math.cos(radians) - 1) * 68}px) rotateX(${-angle}deg) scale(${scale})`,
          opacity: Math.abs(distance) > 3 ? 0 : Math.max(.15, 1 - Math.abs(distance) * .28),
          visibility: Math.abs(distance) > 3 ? "hidden" : "visible",
        }} onPointerDown={event => { event.preventDefault(); wheel.current?.focus(); select(number); }}>{fa(number)}</div>;
      })}</div>
    </div>
  </div>;
}
