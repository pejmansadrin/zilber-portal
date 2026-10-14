import { MobileBack } from "@/components/navigation/MobileBack";
import s from "./Portal.module.css";
export { Avatar } from "./PortalHeader";

// Identity is a separate streamed slot; it never gates the page content.
export function PortalShell({ children, header }: { children: React.ReactNode; header: React.ReactNode }) {
  return <div className={`${s.page} ${s.dashboardPage}`}>
    <div className={s.dashboardBackdrop} aria-hidden="true" />
    <a className={s.skip} href="#main-content">رفتن به محتوای اصلی</a>
    {header}
    <main id="main-content" className={s.main}><MobileBack />{children}</main>
    <footer className={s.footer}><span>زیلبر · فضای یکپارچهٔ همکاران</span><span>هر روز، یک قدم در کنار هم.</span></footer>
  </div>;
}
