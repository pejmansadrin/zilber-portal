'use client';

import { Children, isValidElement, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import s from './Select.module.css';

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'>;
type Option = { value: string; label: ReactNode; text: string; disabled: boolean };
function textContent(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : String(child)).join('');
}
function optionsFrom(children: ReactNode, disabled = false): Option[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return [];
    if (child.type !== 'option') return optionsFrom(child.props.children, disabled || !!child.props.disabled);
    const text = textContent(child.props.children);
    return [{ value: String(child.props.value ?? text), label: child.props.children, text, disabled: disabled || !!child.props.disabled }];
  });
}

/** Branded listbox; the native select only preserves form values, validation and reset. */
export function Select({ children, value, defaultValue, id, className, style, disabled, onChange, ...props }: Props) {
  const generated = useId();
  const controlId = id ?? generated;
  const listId = `${controlId}-options`;
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [internal, setInternal] = useState(String(defaultValue ?? ''));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [invalid, setInvalid] = useState(false);
  const options = optionsFrom(children);
  const selectedValue = value === undefined ? internal : String(value);
  const selectedIndex = options.findIndex(option => option.value === selectedValue);
  const selected = options[selectedIndex] ?? options[0];
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  function position() {
    const menu = list.current, button = trigger.current;
    if (!menu || !button) return;
    const rect = button.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0, left = viewport?.offsetLeft ?? 0;
    const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
    const below = Math.max(0, top + height - rect.bottom - 12);
    const above = Math.max(0, rect.top - top - 12);
    const upwards = below < 180 && above > below;
    const menuWidth = Math.min(Math.max(rect.width, 160), width - 16);
    const menuHeight = Math.min(300, upwards ? above : below);
    Object.assign(menu.style, { width: `${menuWidth}px`, maxHeight: `${menuHeight}px`, left: `${Math.max(left + 8, Math.min(rect.right - menuWidth, left + width - menuWidth - 8))}px`, top: `${upwards ? Math.max(top + 8, rect.top - Math.min(menu.scrollHeight, menuHeight) - 6) : rect.bottom + 6}px` });
  }
  function close(restore = false) {
    if (list.current?.matches(':popover-open')) list.current.hidePopover();
    setOpen(false);
    if (restore) trigger.current?.focus({ preventScroll: true });
  }
  function show(index = selectedIndex) {
    if (disabled || !list.current) return;
    const next = index >= 0 && !options[index]?.disabled ? index : options.findIndex(option => !option.disabled);
    setActive(next);
    list.current.showPopover();
    position(); setOpen(true);
    requestAnimationFrame(() => { optionRefs.current[next]?.scrollIntoView({ block: 'nearest' }); list.current?.focus({ preventScroll: true }); });
  }
  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled || !native.current) return;
    native.current.value = option.value;
    // A real select change preserves React onChange and parent form dirty tracking.
    native.current.dispatchEvent(new Event('change', { bubbles: true }));
    close(true);
  }
  function keyDown(event: KeyboardEvent<HTMLElement>) {
    const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); return; }
    if (event.key === 'Tab') { close(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const current = enabled.indexOf(open ? active : selectedIndex);
      const index = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[Math.max(0, Math.min(enabled.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)))];
      if (index === undefined) return;
      if (!open) show(index); else { setActive(index); optionRefs.current[index]?.scrollIntoView({ block: 'nearest' }); }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); if (open) choose(active); else show();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      search.current.text = now - search.current.time > 700 ? event.key : search.current.text + event.key;
      search.current.time = now;
      const needle = search.current.text.toLocaleLowerCase('fa');
      const index = enabled.find(index => options[index].text.toLocaleLowerCase('fa').startsWith(needle));
      if (index !== undefined) { if (!open) show(index); else { setActive(index); optionRefs.current[index]?.scrollIntoView({ block: 'nearest' }); } }
    }
  }
  useEffect(() => {
    const select = native.current;
    const form = select?.form;
    function reset() { setInvalid(false); requestAnimationFrame(() => setInternal(select?.value ?? '')); }
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, []);
  useEffect(() => {
    if (!open) return;
    const reposition = () => position();
    window.addEventListener('resize', reposition);
    document.addEventListener('scroll', reposition, true);
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);
    const observer = new ResizeObserver(reposition);
    if (trigger.current) observer.observe(trigger.current);
    return () => {
      window.removeEventListener('resize', reposition); document.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition); window.visualViewport?.removeEventListener('scroll', reposition); observer.disconnect();
    };
  }, [open]);

  return <div className={s.root}>
    <button ref={trigger} id={controlId} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
      aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-invalid={invalid || props['aria-invalid']} aria-describedby={props['aria-describedby']} aria-required={props.required}
      disabled={disabled} className={`${s.trigger} ${className ?? ''}`} style={style} onClick={() => open ? close(true) : show()} onKeyDown={keyDown}>
      <span className={s.value}>{selected?.label ?? 'انتخاب کنید'}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    <select {...props} ref={native} value={value} defaultValue={defaultValue} disabled={disabled} className={s.native} tabIndex={-1} aria-hidden="true"
      onInvalid={event => { event.preventDefault(); setInvalid(true); show(); }} onChange={event => { setInvalid(false); setInternal(event.target.value); onChange?.(event); }}>{children}</select>
    <div ref={list} id={listId} popover="auto" role="listbox" tabIndex={-1} className={s.menu} dir={props.dir ?? 'rtl'}
      aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby'] ?? controlId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
      onToggle={event => setOpen(event.newState === 'open')} onKeyDown={keyDown}>
      {options.map((option, index) => <div key={`${option.value}-${index}`} ref={element => { optionRefs.current[index] = element; }} id={`${listId}-${index}`} role="option" aria-selected={option.value === selected?.value} aria-disabled={option.disabled}
        className={s.option} data-active={index === active} onPointerMove={() => { if (!option.disabled) setActive(index); }} onClick={event => { event.preventDefault(); choose(index); }}>
        <span>{option.label}</span>{option.value === selected?.value && <Check size={15} aria-hidden="true" />}
      </div>)}
    </div>
    {invalid && <small className={s.error} role="alert">یک گزینه انتخاب کنید.</small>}
  </div>;
}
