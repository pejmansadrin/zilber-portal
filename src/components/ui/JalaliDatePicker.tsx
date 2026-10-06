'use client';

import { Select } from "@/components/ui/Select";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toPersianDate } from '@/lib/persian-date';
import { addCalendarDays, dateInJalaliMonth, jalaliMonth, jalaliMonths, jalaliParts, jalaliWeekdays, moveJalaliMonth, persianDigits, selectableCalendarDate } from '@/lib/jalali-calendar';
import s from './JalaliDatePicker.module.css';

// Controlled values and emitted dates are Gregorian ISO; every visible date is Jalali.
export function JalaliDatePicker({ value, onChange, max, disabled = false, label = 'تاریخ شمسی' }: {
  value: string; onChange: (iso: string) => void; max: string; disabled?: boolean; label?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const validValue = selectableCalendarDate(value, max) ? value : max;
  const maximum = jalaliParts(max);
  const [view, setView] = useState(() => jalaliParts(validValue));
  const [focused, setFocused] = useState(validValue);
  const [previousValue, setPreviousValue] = useState(value);
  // Reset the calendar when the owning form resets or receives another date.
  if (previousValue !== value) {
    setPreviousValue(value); setView(jalaliParts(validValue)); setFocused(validValue); setOpen(false);
  }
  const month = useMemo(() => jalaliMonth(view.year, view.month), [view.year, view.month]);
  const monthTitle = `${jalaliMonths[view.month - 1]} ${persianDigits(view.year)}`;
  const years = Array.from({ length: maximum.year - 1200 + 1 }, (_, index) => maximum.year - index);
  const nextDisabled = view.year === maximum.year && view.month >= maximum.month;
  const previousDisabled = view.year === 1200 && view.month === 1;
  const focusDay = (iso: string) => requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)?.focus());
  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus({ preventScroll: true }); }
  function select(iso: string) {
    if (disabled || !selectableCalendarDate(iso, max)) return;
    onChange(iso); setFocused(iso); close();
  }
  function changeView(year: number, number: number) {
    if (year < 1200 || year > maximum.year) return;
    const monthNumber = year === maximum.year ? Math.min(number, maximum.month) : number;
    const next = dateInJalaliMonth(year, monthNumber, jalaliParts(focused).day);
    const selected = next > max ? max : next;
    setView(jalaliParts(selected)); setFocused(selected);
  }
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open || disabled) return;
    const viewport = window.visualViewport;
    function fit() {
      if (!element) return;
      element.style.setProperty('--calendar-vh', `${viewport?.height ?? window.innerHeight}px`);
      element.style.setProperty('--calendar-vw', `${viewport?.width ?? document.documentElement.clientWidth}px`);
      element.style.setProperty('--calendar-top', `${viewport?.offsetTop ?? 0}px`);
      element.style.setProperty('--calendar-left', `${viewport?.offsetLeft ?? 0}px`);
    }
    fit();
    if (!element.open) element.showModal();
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => element.querySelector<HTMLButtonElement>('button[data-date][tabindex="0"]')?.focus({ preventScroll: true }));
    window.addEventListener('resize', fit);
    viewport?.addEventListener('resize', fit); viewport?.addEventListener('scroll', fit);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', fit);
      viewport?.removeEventListener('resize', fit); viewport?.removeEventListener('scroll', fit);
      document.documentElement.style.overflow = previousOverflow;
      if (element.open) element.close();
    };
  }, [open, disabled]);
  function keyDown(event: KeyboardEvent<HTMLTableElement>) {
    const iso = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-date]')?.dataset.date;
    if (!iso) return;
    const current = jalaliParts(iso);
    const weekday = (new Date(iso + 'T12:00:00Z').getUTCDay() + 1) % 7;
    let next: string;
    switch (event.key) {
      // Dates advance visually to the left in this RTL, Saturday-first grid.
      case 'ArrowLeft': next = addCalendarDays(iso, 1); break;
      case 'ArrowRight': next = addCalendarDays(iso, -1); break;
      case 'ArrowDown': next = addCalendarDays(iso, 7); break;
      case 'ArrowUp': next = addCalendarDays(iso, -7); break;
      case 'Home': next = addCalendarDays(iso, -weekday); break;
      case 'End': next = addCalendarDays(iso, 6 - weekday); break;
      case 'PageUp':
      case 'PageDown': {
        const direction = event.key === 'PageUp' ? -1 : 1;
        const target = moveJalaliMonth(current.year, current.month, direction * (event.shiftKey ? 12 : 1));
        event.preventDefault();
        if (target.year < 1200 || target.year > maximum.year) return;
        next = dateInJalaliMonth(target.year, target.month, current.day); break;
      }
      default: return;
    }
    event.preventDefault();
    if (!selectableCalendarDate(next, max)) return;
    setView(jalaliParts(next)); setFocused(next); focusDay(next);
  }
  return <div className={s.field} ref={root}>
    <span className={s.label} id={`${id}-label`}>{label}</span>
    <button type="button" ref={trigger} className={s.trigger} disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open && !disabled} aria-controls={`${id}-calendar`} onClick={() => {
      if (open) { close(); return; }
      setView(jalaliParts(validValue)); setFocused(validValue); setOpen(true);
    }}><CalendarDays size={17} /><span dir="ltr" id={`${id}-value`}>{persianDigits(toPersianDate(value))}</span><ChevronDown size={16} /></button>
    <dialog ref={dialog} id={`${id}-calendar`} className={s.dialog} dir="rtl" aria-labelledby={`${id}-title`}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
      onClose={event => { event.stopPropagation(); if (!dialog.current?.open) setOpen(false); }}>
      <header className={s.dialogHeader}><CalendarDays size={20} aria-hidden="true" /><h2 id={`${id}-title`}>انتخاب {label}</h2><button type="button" className={s.close} aria-label="بستن تقویم" onClick={close}><X size={19} /></button></header>
      <div className={s.dialogBody}>
        <section className={s.calendar} aria-label="تقویم شمسی">
          <div className={s.toolbar}>
            <button type="button" className={s.navigation} disabled={previousDisabled} aria-label="ماه قبل" onClick={() => { const previous = moveJalaliMonth(view.year, view.month, -1); changeView(previous.year, previous.month); }}><ChevronRight size={17} /></button>
            <div className={s.monthSelectors}>
              <Select aria-label="ماه شمسی" value={view.month} onChange={event => changeView(view.year, Number(event.target.value))}>{jalaliMonths.map((name, index) => <option key={name} value={index + 1} disabled={view.year === maximum.year && index + 1 > maximum.month}>{name}</option>)}</Select>
              <Select aria-label="سال شمسی" value={view.year} onChange={event => changeView(Number(event.target.value), view.month)}>{years.map(year => <option key={year} value={year}>{persianDigits(year)}</option>)}</Select>
            </div>
            <button type="button" className={s.navigation} disabled={nextDisabled} aria-label="ماه بعد" onClick={() => { const next = moveJalaliMonth(view.year, view.month, 1); changeView(next.year, next.month); }}><ChevronLeft size={17} /></button>
          </div>
          <span className={s.srOnly} aria-live="polite">{monthTitle}</span>
          <table className={s.grid} role="grid" aria-label={monthTitle} onKeyDown={keyDown}>
            <thead><tr>{jalaliWeekdays.map(day => <th key={day} scope="col" abbr={day}><span aria-label={day}>{day === 'پنجشنبه' ? 'پ' : day === 'جمعه' ? 'ج' : day[0]}</span></th>)}</tr></thead>
            <tbody>{Array.from({ length: month.cells.length / 7 }, (_, row) => <tr key={row}>{month.cells.slice(row * 7, row * 7 + 7).map((date, index) => <td key={index} role="gridcell" aria-selected={date ? date.iso === value : undefined}>
              {date && <button type="button" className={s.day} data-date={date.iso} data-selected={date.iso === value} data-today={date.iso === max} disabled={!selectableCalendarDate(date.iso, max)}
                tabIndex={date.iso === focused ? 0 : -1} aria-current={date.iso === max ? 'date' : undefined}
                aria-label={new Date(date.iso + 'T12:00:00Z').toLocaleDateString('fa-IR-u-ca-persian', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                onFocus={() => setFocused(date.iso)} onClick={() => select(date.iso)}>{persianDigits(date.day)}</button>}
            </td>)}</tr>)}</tbody>
          </table>
          <div className={s.footer}><span>هفته از شنبه شروع می‌شود</span><button type="button" onClick={() => select(max)}>امروز</button></div>
        </section>
      </div>
    </dialog>
  </div>;
}
