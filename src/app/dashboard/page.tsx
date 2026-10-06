import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  CalendarDays,
  Check,
  Clock3,
  ContactRound,
  FileText,
  GraduationCap,
  KeyRound,
  Landmark,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getAccount } from "@/lib/account/data";
import { accountSectionHref } from "@/lib/account/routes";
import {
  completionFields,
  getProfileChecklist,
  profileCompletion,
} from "@/lib/account-fields";
import { Avatar, PortalShell } from "@/components/portal/PortalShell";
import s from "@/components/portal/Portal.module.css";
import d from "./Dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "صفحهٔ اصلی | پورتال زیلبر" };

const tools = [
  {
    href: "/attendance",
    title: "حضور و غیاب",
    text: "ثبت ورود و خروج و مرور ساعات حضور؛ نسخهٔ اولیه.",
    icon: Clock3,
    label: "مشاهدهٔ حضور و غیاب",
    number: "۰۱",
  },
  {
    href: accountSectionHref(),
    title: "اطلاعات شخصی",
    text: "مشخصات فردی، تصویر حساب و اطلاعات شما.",
    icon: UserRound,
    label: "مشاهده و ویرایش",
    number: "۰۲",
  },
  {
    href: accountSectionHref("documents"),
    title: "مدارک و گواهی‌ها",
    text: "دسترسی به مدارک و بارگذاری فایل‌های تازه.",
    icon: FileText,
    label: "مدیریت مدارک",
    number: "۰۳",
  },
  {
    href: accountSectionHref("career"),
    title: "مسیر حرفه‌ای",
    text: "تجربه‌های کاری، تحصیلات و مهارت‌های شما.",
    icon: GraduationCap,
    label: "تکمیل سوابق",
    number: "۰۴",
  },
  {
    href: accountSectionHref("employment"),
    title: "پروندهٔ همکاری",
    text: "قراردادها، خدمات سازمانی و ارزیابی‌ها.",
    icon: ShieldCheck,
    label: "مشاهدهٔ پرونده",
    number: "۰۵",
  },
];
const shortcuts = [
  {
    href: accountSectionHref("contact"),
    title: "تماس و نشانی",
    text: "به‌روزرسانی راه‌های ارتباطی",
    icon: ContactRound,
  },
  {
    href: accountSectionHref("finance"),
    title: "بانک و بیمه",
    text: "مدیریت اطلاعات مالی شخصی",
    icon: Landmark,
  },
  {
    href: accountSectionHref("security"),
    title: "امنیت حساب",
    text: "تغییر رمز عبور",
    icon: KeyRound,
  },
];

export default async function DashboardPage() {
  const { user, employee, avatar, accessRole } = await getAccount();
  const name =
    employee?.full_name ||
    String(user.user_metadata.full_name || "همکار زیلبر");
  const first = employee?.preferred_name || employee?.first_name || name;
  const completion = employee ? profileCompletion(employee) : 0;
  const completedCount = employee
    ? completionFields.filter((key) =>
        Boolean(employee[key as keyof typeof employee]),
      ).length
    : 0;
  const checks = getProfileChecklist(employee || {}).map((item) => ({
    ...item,
    href: accountSectionHref(item.section),
  }));
  const nextStep = checks.find((item) => !item.complete);
  const today = new Date();
  const weekday = new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    timeZone: "Asia/Tehran",
  }).format(today);
  const date = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
    timeZone: "Asia/Tehran",
  }).format(today);

  return (
    <PortalShell gender={employee?.gender} accessRole={accessRole}
      name={name}
      avatar={avatar}
      email={user.email}
      role={[employee?.job_title, employee?.department].filter(Boolean).join(" · ")}
      variant="dashboard"
    >
      <div className={d.pageHeading}>
        <div>
          <p className={d.eyebrow}>پورتال همکاران زیلبر</p>
          <h1>میز کار شما</h1>
        </div>
        <div className={d.date}>
          <span className={d.dateIcon}>
            <CalendarDays size={20} aria-hidden="true" />
          </span>
          <div>
            <span>{weekday}</span>
            <time
              dateTime={new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Tehran",
              }).format(today)}
            >
              {date}
            </time>
          </div>
        </div>
      </div>

      <div className={d.overview}>
        <section
          className={`${d.surface} ${d.welcome}`}
          aria-labelledby="welcome-heading"
        >
          <div className={d.identity}>
            <Avatar name={name} src={avatar} gender={employee?.gender} />
            <div>
              <p className={d.eyebrow}>خوش آمدید</p>
              <h2 id="welcome-heading">سلام، {first}</h2>
              <p className={d.role}>
                {[employee?.job_title, employee?.department]
                  .filter(Boolean)
                  .join(" · ") || "همکار زیلبر"}
              </p>
            </div>
          </div>
          <p className={d.welcomeText}>
            اطلاعات شخصی، مدارک و مسیر همکاری‌تان را از همین‌جا دنبال کنید.
          </p>
          <div className={d.welcomeActions}>
            {accessRole === "super_admin" && (
              <Link href="/people" className={`${s.button} ${d.primaryAction}`}>
                <ShieldCheck size={17} aria-hidden="true" />
                {accessRole === "super_admin" ? "پنل مدیریت" : "مدیریت پرونده‌ها"}
                <ArrowLeft size={16} aria-hidden="true" />
              </Link>
            )}
            <Link href={accountSectionHref()} className={`${s.button} ${d.primaryAction}`}>
              رفتن به حساب من
              <ArrowLeft size={16} aria-hidden="true" />
            </Link>
            <Link href={accountSectionHref("documents")} className={d.textLink}>
              مدارک و گواهی‌های من
              <ArrowUpLeft size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={d.accountLine}>
            <span>حساب سازمانی</span>
            <span dir="ltr">{user.email}</span>
          </div>
        </section>

        {completion < 100 && <section
          className={d.completionCard}
          aria-labelledby="completion-heading"
        >
          <div className={d.completionTop}>
            <div>
              <p className={d.completionEyebrow}>پروندهٔ شخصی</p>
              <h2 id="completion-heading">
                {completion === 100
                  ? "اطلاعات پایه کامل است"
                  : "حسابی کامل‌تر، همراه شما"}
              </h2>
              <p>
                {employee
                  ? `${completedCount.toLocaleString("fa-IR")} مورد از ${completionFields.length.toLocaleString("fa-IR")} اطلاعات پایه تکمیل شده`
                  : "پروندهٔ پرسنلی هنوز متصل نشده است."}
              </p>
            </div>
            <div
              className={d.completionRing}
              role="progressbar"
              aria-label="تکمیل اطلاعات پایه"
              aria-valuenow={completion}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle className={d.ringTrack} cx="50" cy="50" r="43" />
                <circle
                  className={d.ringValue}
                  cx="50"
                  cy="50"
                  r="43"
                  pathLength="100"
                  strokeDasharray={`${completion} 100`}
                />
              </svg>
              <span aria-hidden="true">
                {completion.toLocaleString("fa-IR")}
                <small>٪</small>
              </span>
            </div>
          </div>
          {employee ? (
            <>
              <ul className={d.completionSteps}>
                {checks.map((item) => (
                  <li key={item.label}>
                    <span
                      className={`${d.stepStatus} ${item.complete ? d.stepDone : ""}`}
                      aria-hidden="true"
                    >
                      {item.complete ? <Check size={12} /> : <span />}
                    </span>
                    <span>{item.label}</span>
                    <span className={d.stepLabel}>
                      {item.complete ? "تکمیل شده" : "نیاز به تکمیل"}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={nextStep?.href || "/account"}
                className={d.completionAction}
              >
                {nextStep ? `تکمیل ${nextStep.label}` : "مشاهدهٔ حساب"}
                <ArrowLeft size={16} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <p className={d.profileNotice}>
              برای اتصال حساب به پروندهٔ پرسنلی، با مسئول سامانه هماهنگ کنید.
            </p>
          )}
        </section>}
      </div>

      <section className={d.services} aria-labelledby="services-heading">
        <div className={d.sectionHeading}>
          <div>
            <h2 id="services-heading">دسترسی‌های شما</h2>
            <p>بخش موردنیازتان را انتخاب کنید.</p>
          </div>
          <span className={d.sectionCaption}>خدمات شخصی</span>
        </div>
        <div className={d.toolGrid}>
          {tools.map(({ href, title, text, icon: Icon, label, number }) => (
            <Link key={href} href={href} className={`${d.surface} ${d.tool}`}>
              <div className={d.toolTop}>
                <span className={d.toolIcon}>
                  <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span className={d.toolNumber} aria-hidden="true">
                  {number}
                </span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className={d.toolLink}>
                {label}
                <ArrowLeft size={17} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section
        className={`${d.surface} ${d.quickAccess}`}
        aria-labelledby="quick-access-heading"
      >
        <div className={d.quickHeading}>
          <h2 id="quick-access-heading">دسترسی سریع</h2>
          <p>برای کارهای کوتاه و روزمره</p>
        </div>
        <div className={d.quickLinks}>
          {shortcuts.map(({ href, title, text, icon: Icon }) => (
            <Link key={href} href={href} className={d.quickLink}>
              <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
              <ArrowUpLeft
                size={15}
                className={d.quickArrow}
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>

      <aside className={d.upcoming} aria-label="خدمات در حال آماده‌سازی">
        <Clock3 size={19} aria-hidden="true" />
        <p>
          <strong>مرخصی و مأموریت</strong>
          <span>به‌زودی به میز کار شما اضافه می‌شوند.</span>
        </p>
        <span className={d.upcomingBadge}>در حال آماده‌سازی</span>
      </aside>
    </PortalShell>
  );
}
