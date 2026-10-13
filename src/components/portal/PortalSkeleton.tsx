import s from "./PortalSkeleton.module.css";

export function PortalSkeleton() {
  return <section className={s.skeleton} role="status" aria-label="در حال دریافت اطلاعات" aria-busy="true">
    <span className={s.label}>در حال دریافت اطلاعات…</span>
    <div className={s.heading} aria-hidden="true" />
    <div className={s.card} aria-hidden="true">
      <div className={s.line} /><div className={s.line} /><div className={s.shortLine} />
    </div>
    <div className={s.grid} aria-hidden="true">
      <div className={s.card}><div className={s.line} /><div className={s.shortLine} /></div>
      <div className={s.card}><div className={s.line} /><div className={s.shortLine} /></div>
    </div>
  </section>;
}
