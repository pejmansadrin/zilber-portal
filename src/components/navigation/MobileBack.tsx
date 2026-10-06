"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import s from "./MobileBack.module.css";

function BackLink() {
  const pathname = usePathname();
  const params = useSearchParams();
  // Explicit parents keep direct visits and external history inside the portal.
  let href = "/dashboard";
  let label = "برگشت به صفحهٔ اصلی";
  if (pathname === "/account" && params.get("section") && params.get("section") !== "overview") {
    href = "/account?section=overview#account-workspace";
    label = "برگشت به نمای کلی حساب";
  } else if (pathname === "/people" && params.size > 0) {
    href = "/people";
    label = "برگشت به فهرست کاربران";
  } else if (pathname.startsWith("/admin/")) {
    href = "/people";
    label = "برگشت به پنل مدیریت";
  }
  if (pathname === "/dashboard") {
    return null;
  }
  return <Link href={href} replace prefetch={false} className={s.mobileBack} aria-label={label} title={label}>
    <ArrowRight size={19} aria-hidden="true" /><span>برگشت</span>
  </Link>;
}

export function MobileBack() {
  return <div className={s.row}><Suspense fallback={null}><BackLink /></Suspense></div>;
}
