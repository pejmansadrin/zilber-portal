"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePageLoading } from "@/components/ui/PageLoadingOverlay";

export default function AppLink({ onNavigate, prefetch = null, ...props }: ComponentProps<typeof Link>) {
  const { startLoading } = usePageLoading();
  return <Link {...props} prefetch={prefetch} onNavigate={event => {
    let cancelled = false;
    onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
    if (cancelled) return;
    if (typeof props.href === "string") {
      const next = new URL(props.href, window.location.href);
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
    }
    startLoading();
  }} />;
}
