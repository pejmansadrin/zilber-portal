"use client";

import Image from "next/image";
import { MobileBack } from "@/components/navigation/MobileBack";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGrid, UserRound, ShieldCheck, LogOut, X, Clock3 } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import Loader from "@/components/ui/loader-4";
import { accountSectionHref } from "@/lib/account/routes";
import { ProfileImage } from "./ProfileImage";
import { createClient } from "@/lib/supabase/client";
import s from "./Portal.module.css";

export function Avatar({ name, src, gender, small = false }: {
  name: string;
  src?: string | null;
  gender?: string | null;
  small?: boolean;
}) {
  return <span className={small ? s.miniAvatar : s.avatar}>
    <ProfileImage src={src} gender={gender} alt={`تصویر ${name}`} width={90} height={90} />
  </span>;
}

export function PortalShell({
  children,
  name,
  avatar,
  email,
  role,
  accessRole,
  gender,
}: {
  children: React.ReactNode;
  name: string;
  avatar?: string | null;
  variant?: "default" | "dashboard";
  email?: string;
  role?: string;
  accessRole?: string | null;
  gender?: string | null;
}) {
  const path = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Smooth Corner Profile Popover Menu State
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => {
    setMenuMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMenuVisible(true);
      });
    });
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setTimeout(() => {
      setMenuMounted(false);
    }, 180);
  };

  const toggleMenu = () => {
    if (menuMounted) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // Close popover on Escape
  useEffect(() => {
    if (!menuMounted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuMounted]);

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch {
      setError("خروج انجام نشد؛ دوباره تلاش کنید.");
      setBusy(false);
    }
  }

  return (
    <div className={`${s.page} ${s.dashboardPage}`}>
      <div className={s.dashboardBackdrop} aria-hidden="true" />
      <a className={s.skip} href="#main-content">
        رفتن به محتوای اصلی
      </a>

      {/* Slim, Edge-to-Edge Sticky Header with Circular Controls */}
      <header className={`${s.header} ${menuMounted ? s.headerMenuOpen : ""}`}>
        <div className={s.headerInner}>
          {/* Brand Logo (Right side in RTL) */}
          <Link href="/dashboard" className={s.brand}>
            <Image
              src="/images/zilber-logo.svg"
              width={28}
              height={28}
              alt=""
              className={s.brandLogoImg}
            />
            <span>
              <strong>زیلبر</strong>
              <small>ZILBER PEOPLE</small>
            </span>
          </Link>

          {/* Minimal Circular Controls on Left (RTL end) */}
          <div className={s.headerActions}>
            <ThemeToggle className={s.themeToggleButton} />
            <div className={s.profileTriggerWrap}>
              <button
                type="button"
                onClick={toggleMenu}
                className={`${s.profileAvatarBtn} ${menuMounted ? s.profileAvatarBtnActive : ""}`}
                aria-label="منوی حساب کاربری و ناوبری پورتال"
                aria-expanded={menuMounted}
                aria-haspopup="menu"
              >
                <Avatar name={name} src={avatar} gender={gender} small />
              </button>

              {menuMounted && (
                <>
                  <div
                    className={s.cornerBackdrop}
                    onClick={closeMenu}
                    aria-hidden="true"
                  />
                  <div
                    className={`${s.cornerCard} ${menuVisible ? s.cornerCardActive : ""}`}
                    role="menu"
                    aria-label="منوی حساب کاربری و دسترسی سریع"
                  >
                    {/* User Identity Section - Integrated Header */}
                    <div className={s.cornerHeader}>
                      <Link
                        href={accountSectionHref()}
                        onClick={closeMenu}
                        className={s.cornerUserLink}
                        title="مشاهده و ویرایش پرونده پرسنلی"
                      >
                        <div className={s.cornerAvatarWrap}>
                          <Avatar name={name} src={avatar} gender={gender} small />
                        </div>
                        <div className={s.cornerUserDetails}>
                          <span id="corner-user-name" className={s.cornerUserName}>
                            {name}
                          </span>
                          <span className={s.cornerUserRole}>
                            {role || "همکار زیلبر"}
                          </span>
                          {email && (
                            <span className={s.cornerUserEmail} dir="ltr">
                              {email}
                            </span>
                          )}
                        </div>
                      </Link>
                      <button
                        type="button"
                        className={s.cornerCloseBtn}
                        onClick={closeMenu}
                        aria-label="بستن منو"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>

                    <div className={s.cornerDivider} />

                    {/* Unified Navigation Items */}
                    <nav className={s.cornerNav} aria-label="ناوبری پورتال">
                      <Link href="/attendance" onClick={closeMenu} role="menuitem" aria-current={path === "/attendance" ? "page" : undefined} className={`${s.cornerNavItem} ${path === "/attendance" ? s.cornerNavItemActive : ""}`}>
                        <span className={s.cornerNavIcon}><Clock3 size={15} /></span>
                        <div className={s.cornerNavMeta}><span className={s.cornerNavTitle}>حضور و غیاب</span><span className={s.cornerNavSub}>ثبت تردد و ساعات حضور · نسخهٔ اولیه</span></div>
                        {path === "/attendance" && <span className={s.cornerActiveIndicator} />}
                      </Link>
                      {accessRole === "super_admin" && (
                        <Link
                          href="/people"
                          onClick={closeMenu}
                          className={`${s.cornerNavItem} ${path.startsWith("/people") ? s.cornerNavItemActive : ""}`}
                          role="menuitem"
                          aria-current={path.startsWith("/people") ? "page" : undefined}
                        >
                          <span className={s.cornerNavIcon}>
                            <ShieldCheck size={15} aria-hidden="true" />
                          </span>
                          <div className={s.cornerNavMeta}>
                            <span className={s.cornerNavTitle}>{accessRole === "super_admin" ? "پنل مدیریت" : "مدیریت پرونده‌ها"}</span>
                            <span className={s.cornerNavSub}>{accessRole === "super_admin" ? "مدیریت کاربران و همهٔ پرونده‌ها" : "اطلاعات همکاری و پرونده‌های پرسنلی"}</span>
                          </div>
                          {path.startsWith("/people") && <span className={s.cornerActiveIndicator} />}
                        </Link>
                      )}
                      <Link
                        href="/dashboard"
                        onClick={closeMenu}
                        prefetch={true}
                        className={`${s.cornerNavItem} ${
                          path === "/dashboard" ? s.cornerNavItemActive : ""
                        }`}
                        role="menuitem"
                      >
                        <span className={s.cornerNavIcon}>
                          <LayoutGrid size={15} />
                        </span>
                        <div className={s.cornerNavMeta}>
                          <span className={s.cornerNavTitle}>صفحهٔ اصلی</span>
                          <span className={s.cornerNavSub}>میز کار و داشبورد سازمانی</span>
                        </div>
                        {path === "/dashboard" && (
                          <span className={s.cornerActiveIndicator} />
                        )}
                      </Link>

                      <Link
                        href={accountSectionHref()}
                        onClick={closeMenu}
                        prefetch={true}
                        className={`${s.cornerNavItem} ${
                          path.startsWith("/account") ? s.cornerNavItemActive : ""
                        }`}
                        role="menuitem"
                      >
                        <span className={s.cornerNavIcon}>
                          <UserRound size={15} />
                        </span>
                        <div className={s.cornerNavMeta}>
                          <span className={s.cornerNavTitle}>حساب من</span>
                          <span className={s.cornerNavSub}>مشخصات فردی، مدارک و سوابق</span>
                        </div>
                        {path.startsWith("/account") && (
                          <span className={s.cornerActiveIndicator} />
                        )}
                      </Link>
                    </nav>

                    <div className={s.cornerDivider} />

                    {/* Logout Action */}
                    <button
                      type="button"
                      onClick={logout}
                      disabled={busy}
                      className={s.cornerLogoutBtn}
                      role="menuitem"
                      aria-busy={busy}
                    >
                      <span className={s.cornerLogoutIcon}>
                        {busy ? (
                          <Loader size={14} decorative />
                        ) : (
                          <LogOut size={14} aria-hidden="true" />
                        )}
                      </span>
                      <span className={s.cornerLogoutText}>خروج از حساب کاربری</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <p role="alert" className={`${s.message} ${s.error}`}>
          {error}
        </p>
      )}

      <main id="main-content" className={s.main}>
        <MobileBack />
        {children}
      </main>

      <footer className={s.footer}>
        <span>زیلبر · فضای یکپارچهٔ همکاران</span>
        <span>هر روز، یک قدم در کنار هم.</span>
      </footer>
    </div>
  );
}
