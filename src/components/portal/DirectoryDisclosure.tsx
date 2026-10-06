"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, UsersRound, X } from "lucide-react";
import p from "./Portal.module.css";
import s from "./DirectoryDisclosure.module.css";

export function DirectoryDisclosure({ selectedName, children, defaultOpen = false }: { selectedName: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [mobile, setMobile] = useState(false);
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 850px)");
    const update = () => { setMobile(media.matches); if (!media.matches) setOpen(false); };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trigger = triggerRef.current;
    closeRef.current?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])
        .filter(element => element.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keydown);
      requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
    };
  }, [mobile, open]);
  return <div className={s.root}>
    {mobile && open && <div className={p.sectionPickerBackdrop} aria-hidden="true" onClick={() => setOpen(false)} />}
    <div ref={dialogRef} id={id} className={`${s.dock} ${open ? s.expanded : ""}`}
      role={mobile && open ? "dialog" : undefined} aria-modal={mobile && open ? true : undefined}
      aria-labelledby={mobile && open ? `${id}-title` : undefined}>
      <section className={`${s.picker} ${open ? s.pickerOpen : ""}`}>
        <div className={`${p.sectionPickerHeader} ${s.header}`}>
          <div><p className={p.eyebrow}>پنل مدیریت</p><h2 id={`${id}-title`}>انتخاب کاربر</h2></div>
          <button ref={closeRef} type="button" className={p.sectionPickerClose} aria-label="بستن فهرست کاربران" onClick={() => setOpen(false)}><X size={20} aria-hidden="true" /></button>
        </div>
        <div className={s.content} onClick={event => {
          if (!event.defaultPrevented && (event.target as HTMLElement).closest('a[href*="employee="]')) setOpen(false);
        }}>{children}</div>
      </section>
      <button ref={triggerRef} type="button" className={`${p.mobileSectionTrigger} ${s.trigger}`} aria-haspopup="dialog"
        aria-expanded={mobile && open} aria-controls={id} aria-label={open ? "بستن فهرست کاربران" : "انتخاب کاربر"} onClick={() => setOpen(value => !value)}>
        <span className={`${p.mobileSectionIcon} ${s.triggerIcon}`} aria-hidden="true"><UsersRound size={20} /></span>
        <span className={`${p.mobileSectionText} ${s.triggerText}`}><small>پروندهٔ کاربر</small><strong>{selectedName}</strong></span>
        <ChevronDown size={19} aria-hidden="true" />
      </button>
    </div>
  </div>;
}
