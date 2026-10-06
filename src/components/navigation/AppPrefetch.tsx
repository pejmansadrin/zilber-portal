"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Installed Next 16.3 requires kind explicitly when passing prefetch options.
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

/** Private page payloads stay in Next's memory cache for this tab only. */
export function AppPrefetch({ superAdmin = false, legacyTools = false }: {
  superAdmin?: boolean;
  legacyTools?: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    let disposed = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const stale = new Set<string>();
    const routes = ["/dashboard", "/attendance", "/account",
      ...["identity", "contact", "family", "finance", "career", "documents", "employment", "security"]
        .map(section => `/account?section=${section}`),
      ...(legacyTools ? ["/leaves"] : []),
      ...(superAdmin ? ["/people", "/admin/attendance"] : []),
    ];
    const prepare = (href: string) => {
      if (disposed || document.hidden || !navigator.onLine) { stale.add(href); return; }
      stale.delete(href);
      router.prefetch(href, { kind: PrefetchKind.FULL, onInvalidate: () => {
        // Revalidation after a save or expiry should not create a tight loop.
        const timer = setTimeout(() => { timers.delete(timer); prepare(href); }, 1000);
        if (!disposed) timers.add(timer); else clearTimeout(timer);
      } });
    };
    // Stagger requests so the currently displayed page remains responsive.
    routes.forEach((href, index) => {
      const timer = setTimeout(() => { timers.delete(timer); prepare(href); }, index * 120);
      timers.add(timer);
    });
    const resume = () => { if (!document.hidden) [...stale].forEach(prepare); };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      disposed = true;
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [router, superAdmin, legacyTools]);
  return null;
}
