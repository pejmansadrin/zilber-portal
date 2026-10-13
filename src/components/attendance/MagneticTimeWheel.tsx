"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import s from "./TimePicker.module.css";

const rowHeight = 40;
const fa = (number: number) => String(number).padStart(2, "0").replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export function MagneticTimeWheel({ title, count, values, value, onChange }: {
  title: string; count: number; values?: number[]; value: number; onChange: (value: number) => void;
}) {
  const options = values || Array.from({ length: count }, (_, number) => number);
  const wheel = useRef<HTMLDivElement>(null);
  const latest = useRef({ value, onChange, options });
  const aligned = useRef<{ value: number; options: string } | null>(null);
  const sync = useRef(() => {});

  useLayoutEffect(() => {
    latest.current = { value, onChange, options };
    sync.current = () => {
      const element = wheel.current;
      if (!element?.clientHeight) return;
      const key = options.join(",");
      if (aligned.current?.value === value && aligned.current.options === key) return;
      element.scrollTop = Math.max(0, options.indexOf(value)) * rowHeight;
      aligned.current = { value, options: key };
    };
    sync.current();
  });

  useEffect(() => {
    const element = wheel.current;
    if (!element) return;
    const observer = new ResizeObserver(() => sync.current());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function select(index: number) {
    const current = latest.current;
    const bounded = Math.max(0, Math.min(current.options.length - 1, Math.round(index)));
    const next = current.options[bounded];
    if (next === undefined) return;
    aligned.current = { value: next, options: current.options.join(",") };
    if (next !== current.value) { current.value = next; current.onChange(next); }
  }

  function moveTo(index: number) {
    const bounded = Math.max(0, Math.min(latest.current.options.length - 1, index));
    wheel.current?.scrollTo({ top: bounded * rowHeight, behavior: "instant" });
    select(bounded);
  }

  return <div className={s.wheelColumn}>
    <span className={s.wheelTitle}>{title}</span>
    <div className={s.wheelFrame}>
      <div className={s.magnetBand} aria-hidden="true" />
      <div ref={wheel} className={s.wheel} role="spinbutton" tabIndex={0} aria-label={title}
        aria-valuemin={Math.min(...options)} aria-valuemax={Math.max(...options)} aria-valuenow={value} aria-valuetext={fa(value)}
        onScroll={event => { if (event.currentTarget.clientHeight) select(event.currentTarget.scrollTop / rowHeight); }}
        onKeyDown={event => {
          const index = latest.current.options.indexOf(latest.current.value);
          const next = event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" ? index + 1 : event.key === "PageUp" ? index - 5 : event.key === "PageDown" ? index + 5 : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : null;
          if (next !== null) { event.preventDefault(); moveTo(next); }
        }}>
        <div className={s.wheelTrack} aria-hidden="true">{options.map((number, index) =>
          <div key={number} className={`${s.wheelNumber} ${number === value ? s.wheelSelected : ""}`} onClick={() => moveTo(index)}>{fa(number)}</div>
        )}</div>
      </div>
    </div>
  </div>;
}
