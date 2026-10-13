"use client";

import Link from "next/link";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Search, X } from "lucide-react";
import { Avatar } from "./PortalShell";
import { matchesDirectorySearch } from "@/lib/directory-search";
import s from "./Portal.module.css";
import p from "@/app/(portal)/people/People.module.css";

export type DirectoryEntry = {
  id: string; full_name: string; email: string | null; employee_number: string | null;
  department: string | null; job_title: string | null; gender: string | null;
  photo_href: string | null; archived: boolean;
};

export function PeopleDirectory({ directory, selectedId }: { directory: DirectoryEntry[]; selectedId?: string }) {
  const params = useSearchParams();
  const query = (params.get("q") || "").slice(0, 150);
  const input = useRef<HTMLInputElement>(null);
  const visible = directory.filter(person => matchesDirectorySearch(
    [person.full_name, person.email, person.employee_number, person.department, person.job_title], query,
  ));

  function updateQuery(value: string) {
    const url = new URL(window.location.href);
    const trimmed = value.slice(0, 150);
    if (trimmed.trim()) url.searchParams.set("q", trimmed);
    else url.searchParams.delete("q");
    // Keep the open record stable even when it is absent from the results.
    if (selectedId) url.searchParams.set("employee", selectedId);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  return <nav className={`${s.glass} ${s.panel} ${p.directory}`} aria-label="انتخاب پرونده">
    <h2>کاربران · {directory.length.toLocaleString("fa-IR")} نفر</h2>
    <form className={p.search} role="search" onSubmit={event => {
      event.preventDefault();
      input.current?.focus({ preventScroll: true });
    }}>
      <label htmlFor="people-search">جست‌وجوی نام، ایمیل یا کد پرسنلی</label>
      <input ref={input} id="people-search" name="q" type="search" value={query} onChange={event => updateQuery(event.target.value)}
        maxLength={150} placeholder="نام، ایمیل یا کد پرسنلی" aria-controls="people-results" autoComplete="off" />
      <button className={s.secondary} type={query ? "button" : "submit"} aria-label={query ? "پاک کردن جست‌وجو" : "جست‌وجوی کاربران"}
        title={query ? "پاک کردن جست‌وجو" : "جست‌وجو"} onClick={query ? () => {
          updateQuery(""); input.current?.focus({ preventScroll: true });
        } : undefined}>
        {query ? <X size={14} aria-hidden="true" /> : <Search size={14} aria-hidden="true" />}
      </button>
    </form>
    <p className={p.resultCount} role="status" aria-live="polite" aria-atomic="true">
      {query ? `${visible.length.toLocaleString("fa-IR")} کاربر پیدا شد` : ""}
    </p>
    <div id="people-results" className={p.list}>{visible.map(person => <Link
      prefetch={false}
      className={`${p.person} ${selectedId === person.id ? p.selected : ""}`}
      aria-current={selectedId === person.id ? "page" : undefined}
      key={person.id} href={`/people?employee=${encodeURIComponent(person.id)}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>
      <span className={p.personIcon}><Avatar small name={person.full_name} gender={person.gender} src={person.photo_href} /></span>
      <span className={p.personMeta}>
        <strong>{person.full_name}</strong>
        {(person.archived || person.job_title || person.department) && <small>{person.archived ? "بایگانی‌شده" : [person.job_title, person.department].filter(Boolean).join(" · ")}</small>}
      </span>
      {selectedId === person.id && <Check className={p.selectedCheck} size={18} aria-hidden="true" />}
    </Link>)}</div>
    {!visible.length && <p className={s.muted}>کاربری با این مشخصات پیدا نشد.</p>}
  </nav>;
}
