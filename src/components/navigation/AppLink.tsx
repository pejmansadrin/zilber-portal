'use client';
import Link from 'next/link';
import { useState, type ComponentProps } from 'react';
import { usePageLoading } from '@/components/ui/PageLoadingOverlay';

export default function AppLink({ onNavigate, prefetch, onMouseEnter, onFocus, ...props }: ComponentProps<typeof Link>) {
  const { startLoading } = usePageLoading();
  const [intent, setIntent] = useState(false);
  return <Link {...props} prefetch={prefetch === undefined ? intent ? null : false : prefetch}
    onMouseEnter={event => { setIntent(true); onMouseEnter?.(event); }}
    onFocus={event => { setIntent(true); onFocus?.(event); }}
    onNavigate={event => {
      let cancelled = false;
      onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
      if (cancelled) return;
      if (typeof props.href === 'string') {
        const next = new URL(props.href, window.location.href);
        if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      }
      startLoading();
    }} />;
}
