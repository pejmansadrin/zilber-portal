'use client';

import React, { createContext, useContext, useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Loader from '@/components/ui/loader-4';
import s from './PageLoadingOverlay.module.css';

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export function usePageLoading() {
  return useContext(LoadingContext);
}

function LoadingRouteWatcher({ onRouteDone }: { onRouteDone: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onRouteDone();
  }, [pathname, searchParams, onRouteDone]);

  return null;
}

export function PageLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  const startLoading = React.useCallback(() => setIsLoading(true), []);
  const stopLoading = React.useCallback(() => setIsLoading(false), []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Ignore external links, mailto, tel, hashes, and target="_blank"
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        target.target === '_blank'
      ) {
        return;
      }

      // If it's navigating to a different page/search
      const currentUrl = window.location.pathname + window.location.search;
      if (href !== currentUrl && !href.startsWith(currentUrl + '#')) {
        setIsLoading(true);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      <Suspense fallback={null}>
        <LoadingRouteWatcher onRouteDone={stopLoading} />
      </Suspense>
      {children}
      {isLoading && (
        <div className={s.loadingOverlay} role="status" aria-live="polite">
          <Loader size={60} decorative />
        </div>
      )}
    </LoadingContext.Provider>
  );
}
